import marketData from './marketData.js';
import TradingAlgorithm from '../models/TradingAlgorithm.js';
import AlgorithmRule from '../models/AlgorithmRule.js';
import PaperAccount from '../models/PaperAccount.js';
import Order from '../models/Order.js';
import Position from '../models/Position.js';
import Transaction from '../models/Transaction.js';

/**
 * Algorithm Execution Engine
 * Evaluates trading algorithms and executes trades based on rules
 */

class ExecutionEngine {
  constructor() {
    this.runningAlgorithms = new Map();
    this.intervals = new Map();
  }

  /**
   * Start an algorithm
   */
  async startAlgorithm(algorithmId, userId, symbols = []) {
    try {
      const algorithm = await TradingAlgorithm.getById(algorithmId);
      if (!algorithm || algorithm.user_id !== userId) {
        throw new Error('Algorithm not found');
      }

      if (!algorithm.is_active) {
        throw new Error('Algorithm is not active');
      }

      const rules = await AlgorithmRule.getByAlgorithm(algorithmId);
      if (!rules || rules.length === 0) {
        throw new Error('Algorithm has no rules');
      }

      const account = await PaperAccount.getOrCreate(userId);

      // Store algorithm context
      this.runningAlgorithms.set(algorithmId, {
        algorithm,
        rules,
        account,
        userId,
        symbols: symbols.length > 0 ? symbols : ['AAPL'], // Default symbol if none provided
        lastCheck: null
      });

      // Start monitoring interval (check every 60 seconds)
      const interval = setInterval(() => {
        this.evaluateAlgorithm(algorithmId).catch(err => {
          console.error(`Error evaluating algorithm ${algorithmId}:`, err);
        });
      }, 60000);

      this.intervals.set(algorithmId, interval);

      // Run initial evaluation
      await this.evaluateAlgorithm(algorithmId);

      console.log(`Started algorithm ${algorithmId} (${algorithm.name})`);
      return { success: true, message: 'Algorithm started' };
    } catch (error) {
      console.error('Error starting algorithm:', error);
      throw error;
    }
  }

  /**
   * Stop an algorithm
   */
  stopAlgorithm(algorithmId) {
    const interval = this.intervals.get(algorithmId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(algorithmId);
    }

    this.runningAlgorithms.delete(algorithmId);
    console.log(`Stopped algorithm ${algorithmId}`);
  }

  /**
   * Evaluate algorithm rules
   */
  async evaluateAlgorithm(algorithmId) {
    const context = this.runningAlgorithms.get(algorithmId);
    if (!context) return;

    const { algorithm, rules, account, userId, symbols } = context;

    try {
      // Get current market data for all symbols
      const quotes = await marketData.getMultipleQuotes(symbols);

      // Evaluate each symbol
      for (const symbol of symbols) {
        const quote = quotes[symbol];
        if (!quote) continue;

        // Get current position for this symbol
        const position = await Position.getBySymbol(account.id, symbol);

        // Prepare market context
        const marketContext = {
          symbol,
          price: quote.price,
          open: quote.open,
          high: quote.high,
          low: quote.low,
          volume: quote.volume,
          change: quote.change,
          changePercent: quote.changePercent,
          position: position ? {
            quantity: position.quantity,
            averagePrice: position.average_price,
            unrealizedPL: position.unrealized_pl,
            unrealizedPLPercent: position.unrealized_pl_percent
          } : null
        };

        // Sort rules by order_index
        const sortedRules = rules.sort((a, b) => a.order_index - b.order_index);

        // Evaluate each rule
        for (const rule of sortedRules) {
          const shouldExecute = this.evaluateRule(rule, marketContext, account);

          if (shouldExecute) {
            await this.executeAction(rule, marketContext, account, userId, algorithmId);
          }
        }
      }

      context.lastCheck = new Date();
    } catch (error) {
      console.error(`Error evaluating algorithm ${algorithmId}:`, error);
    }
  }

  /**
   * Evaluate a single rule
   */
  evaluateRule(rule, marketContext, account) {
    const { condition_field, condition_operator, condition_value } = rule;

    // Get the field value from market context
    let fieldValue;

    if (condition_field.startsWith('position.')) {
      if (!marketContext.position) return false;
      const posField = condition_field.split('.')[1];
      fieldValue = marketContext.position[posField];
    } else if (condition_field === 'balance') {
      fieldValue = account.balance;
    } else {
      fieldValue = marketContext[condition_field];
    }

    if (fieldValue === undefined || fieldValue === null) return false;

    // Parse condition value (might be numeric or reference another field)
    let compareValue = parseFloat(condition_value);
    if (isNaN(compareValue)) {
      compareValue = marketContext[condition_value] || 0;
    }

    // Evaluate condition
    switch (condition_operator) {
      case '>':
        return fieldValue > compareValue;
      case '<':
        return fieldValue < compareValue;
      case '>=':
        return fieldValue >= compareValue;
      case '<=':
        return fieldValue <= compareValue;
      case '==':
      case '=':
        return fieldValue === compareValue;
      case '!=':
        return fieldValue !== compareValue;
      default:
        return false;
    }
  }

  /**
   * Execute rule action
   */
  async executeAction(rule, marketContext, account, userId, algorithmId) {
    const { action } = rule;
    const { symbol, price, position } = marketContext;

    try {
      // Parse action (format: "buy:100" or "sell:50" or "sell:all")
      const [actionType, actionValue] = action.split(':');

      let quantity;

      if (actionType === 'buy') {
        // Calculate quantity based on action value
        if (actionValue === 'max') {
          // Use all available balance
          quantity = Math.floor(account.balance / price);
        } else {
          // Fixed quantity or percentage of balance
          const value = parseFloat(actionValue);
          if (actionValue.endsWith('%')) {
            const amountToSpend = account.balance * (value / 100);
            quantity = Math.floor(amountToSpend / price);
          } else {
            quantity = Math.floor(value);
          }
        }

        if (quantity > 0) {
          await this.executeBuy(userId, account.id, algorithmId, symbol, quantity, price);
        }
      } else if (actionType === 'sell') {
        if (!position || position.quantity === 0) return;

        // Calculate quantity to sell
        if (actionValue === 'all') {
          quantity = position.quantity;
        } else {
          const value = parseFloat(actionValue);
          if (actionValue.endsWith('%')) {
            quantity = Math.floor(position.quantity * (value / 100));
          } else {
            quantity = Math.min(Math.floor(value), position.quantity);
          }
        }

        if (quantity > 0) {
          await this.executeSell(userId, account.id, algorithmId, symbol, quantity, price);
        }
      }
    } catch (error) {
      console.error(`Error executing action for rule ${rule.id}:`, error);
    }
  }

  /**
   * Execute a buy order
   */
  async executeBuy(userId, accountId, algorithmId, symbol, quantity, price) {
    const totalCost = quantity * price;

    // Get current account
    const account = await PaperAccount.getById(accountId);

    if (account.balance < totalCost) {
      console.log(`Insufficient balance for buy: ${symbol} x${quantity}`);
      return;
    }

    // Create order
    const order = await Order.create({
      userId,
      accountId,
      algorithmId,
      symbol,
      type: 'market',
      side: 'buy',
      quantity,
      price
    });

    // Fill order immediately (paper trading)
    await Order.fill(order.id);

    // Update account balance
    const newBalance = account.balance - totalCost;
    await PaperAccount.updateBalance(accountId, newBalance);

    // Update or create position
    await Position.upsert({
      userId,
      accountId,
      symbol,
      quantity,
      averagePrice: price
    });

    // Record transaction
    await Transaction.create({
      userId,
      accountId,
      orderId: order.id,
      type: 'buy',
      symbol,
      quantity,
      price,
      amount: -totalCost,
      balanceAfter: newBalance,
      description: `Bought ${quantity} shares of ${symbol} @ $${price.toFixed(2)}`
    });

    console.log(`Executed BUY: ${symbol} x${quantity} @ $${price.toFixed(2)} (Algo ${algorithmId})`);
  }

  /**
   * Execute a sell order
   */
  async executeSell(userId, accountId, algorithmId, symbol, quantity, price) {
    const totalProceeds = quantity * price;

    // Get current account
    const account = await PaperAccount.getById(accountId);

    // Create order
    const order = await Order.create({
      userId,
      accountId,
      algorithmId,
      symbol,
      type: 'market',
      side: 'sell',
      quantity,
      price
    });

    // Fill order immediately (paper trading)
    await Order.fill(order.id);

    // Update account balance
    const newBalance = account.balance + totalProceeds;
    await PaperAccount.updateBalance(accountId, newBalance);

    // Update position
    await Position.upsert({
      userId,
      accountId,
      symbol,
      quantity: -quantity,
      averagePrice: price
    });

    // Record transaction
    await Transaction.create({
      userId,
      accountId,
      orderId: order.id,
      type: 'sell',
      symbol,
      quantity,
      price,
      amount: totalProceeds,
      balanceAfter: newBalance,
      description: `Sold ${quantity} shares of ${symbol} @ $${price.toFixed(2)}`
    });

    console.log(`Executed SELL: ${symbol} x${quantity} @ $${price.toFixed(2)} (Algo ${algorithmId})`);
  }

  /**
   * Get running algorithms
   */
  getRunningAlgorithms() {
    return Array.from(this.runningAlgorithms.keys());
  }

  /**
   * Check if algorithm is running
   */
  isRunning(algorithmId) {
    return this.runningAlgorithms.has(algorithmId);
  }

  /**
   * Stop all algorithms
   */
  stopAll() {
    for (const algorithmId of this.runningAlgorithms.keys()) {
      this.stopAlgorithm(algorithmId);
    }
  }
}

// Export singleton instance
export default new ExecutionEngine();
