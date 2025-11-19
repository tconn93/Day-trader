import marketData from './marketData.js';
import TradingAlgorithm from '../models/TradingAlgorithm.js';
import AlgorithmRule from '../models/AlgorithmRule.js';
import db from '../config/database.js';

/**
 * Backtesting Engine
 * Simulates algorithm performance using historical data
 */

class BacktestEngine {
  /**
   * Run a backtest for an algorithm
   */
  async runBacktest(algorithmId, userId, config) {
    const {
      symbol,
      startDate,
      endDate,
      initialCapital = 100000,
      interval = '1d'
    } = config;

    try {
      // Get algorithm and rules
      const algorithm = await TradingAlgorithm.getById(algorithmId);
      if (!algorithm || algorithm.user_id !== userId) {
        throw new Error('Algorithm not found');
      }

      const rules = await AlgorithmRule.getByAlgorithm(algorithmId);
      if (!rules || rules.length === 0) {
        throw new Error('Algorithm has no rules');
      }

      // Get historical data
      const range = this.calculateRange(startDate, endDate);
      const historicalData = await marketData.getHistoricalData(symbol, range, interval);

      if (!historicalData || historicalData.length === 0) {
        throw new Error('No historical data available');
      }

      // Filter data by date range
      const filteredData = historicalData.filter(d => {
        const date = new Date(d.timestamp);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });

      if (filteredData.length === 0) {
        throw new Error('No data in specified date range');
      }

      // Run simulation
      const results = await this.simulateTrades(
        algorithm,
        rules,
        filteredData,
        symbol,
        initialCapital
      );

      // Calculate performance metrics
      const metrics = this.calculateMetrics(results, initialCapital);

      // Save backtest results
      const backtestId = await this.saveBacktest(
        userId,
        algorithmId,
        symbol,
        startDate,
        endDate,
        initialCapital,
        metrics,
        results
      );

      return {
        id: backtestId,
        ...metrics,
        trades: results.trades,
        equity_curve: results.equityCurve
      };
    } catch (error) {
      console.error('Error running backtest:', error);
      throw error;
    }
  }

  /**
   * Simulate trades using historical data
   */
  async simulateTrades(algorithm, rules, historicalData, symbol, initialCapital) {
    let balance = initialCapital;
    let position = null;
    const trades = [];
    const equityCurve = [];

    // Sort rules by order_index
    const sortedRules = rules.sort((a, b) => a.order_index - b.order_index);

    for (let i = 0; i < historicalData.length; i++) {
      const currentBar = historicalData[i];
      const price = currentBar.close;

      // Calculate current portfolio value
      const positionValue = position ? position.quantity * price : 0;
      const totalValue = balance + positionValue;

      equityCurve.push({
        timestamp: currentBar.timestamp,
        balance,
        position_value: positionValue,
        total_value: totalValue
      });

      // Build market context
      const marketContext = {
        symbol,
        price,
        open: currentBar.open,
        high: currentBar.high,
        low: currentBar.low,
        volume: currentBar.volume,
        change: i > 0 ? price - historicalData[i - 1].close : 0,
        changePercent: i > 0 ? ((price - historicalData[i - 1].close) / historicalData[i - 1].close) * 100 : 0,
        position: position ? {
          quantity: position.quantity,
          averagePrice: position.averagePrice,
          unrealizedPL: (price - position.averagePrice) * position.quantity,
          unrealizedPLPercent: ((price - position.averagePrice) / position.averagePrice) * 100
        } : null,
        balance
      };

      // Calculate technical indicators if needed
      const indicators = this.calculateIndicators(historicalData, i);
      Object.assign(marketContext, indicators);

      // Evaluate rules
      for (const rule of sortedRules) {
        const shouldExecute = this.evaluateRule(rule, marketContext);

        if (shouldExecute) {
          const trade = this.executeAction(
            rule,
            marketContext,
            currentBar,
            balance,
            position
          );

          if (trade) {
            trades.push(trade);

            // Update balance and position based on trade
            if (trade.side === 'buy') {
              balance -= trade.cost;
              position = {
                quantity: trade.quantity,
                averagePrice: trade.price,
                entryDate: currentBar.timestamp
              };
            } else if (trade.side === 'sell') {
              balance += trade.proceeds;
              position = null;
            }
          }
        }
      }
    }

    // Close any open position at the end
    if (position) {
      const lastBar = historicalData[historicalData.length - 1];
      const proceeds = position.quantity * lastBar.close;
      const pl = proceeds - (position.quantity * position.averagePrice);

      trades.push({
        timestamp: lastBar.timestamp,
        side: 'sell',
        symbol,
        quantity: position.quantity,
        price: lastBar.close,
        proceeds,
        pl,
        plPercent: (pl / (position.quantity * position.averagePrice)) * 100,
        reason: 'End of backtest period'
      });

      balance += proceeds;
      position = null;
    }

    return { trades, equityCurve, finalBalance: balance };
  }

  /**
   * Evaluate a rule (similar to execution engine)
   */
  evaluateRule(rule, marketContext) {
    const { condition_field, condition_operator, condition_value } = rule;

    let fieldValue;

    if (condition_field.startsWith('position.')) {
      if (!marketContext.position) return false;
      const posField = condition_field.split('.')[1];
      fieldValue = marketContext.position[posField];
    } else {
      fieldValue = marketContext[condition_field];
    }

    if (fieldValue === undefined || fieldValue === null) return false;

    let compareValue = parseFloat(condition_value);
    if (isNaN(compareValue)) {
      compareValue = marketContext[condition_value] || 0;
    }

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
   * Execute action in backtest
   */
  executeAction(rule, marketContext, currentBar, balance, position) {
    const { action } = rule;
    const { symbol, price } = marketContext;

    const [actionType, actionValue] = action.split(':');

    if (actionType === 'buy' && !position) {
      let quantity;

      if (actionValue === 'max') {
        quantity = Math.floor(balance / price);
      } else {
        const value = parseFloat(actionValue);
        if (actionValue.endsWith('%')) {
          const amountToSpend = balance * (value / 100);
          quantity = Math.floor(amountToSpend / price);
        } else {
          quantity = Math.floor(value);
        }
      }

      if (quantity > 0 && balance >= quantity * price) {
        return {
          timestamp: currentBar.timestamp,
          side: 'buy',
          symbol,
          quantity,
          price,
          cost: quantity * price,
          reason: `Rule ${rule.id}: ${rule.rule_type}`
        };
      }
    } else if (actionType === 'sell' && position) {
      let quantity;

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
        const proceeds = quantity * price;
        const cost = quantity * position.averagePrice;
        const pl = proceeds - cost;

        return {
          timestamp: currentBar.timestamp,
          side: 'sell',
          symbol,
          quantity,
          price,
          proceeds,
          pl,
          plPercent: (pl / cost) * 100,
          reason: `Rule ${rule.id}: ${rule.rule_type}`
        };
      }
    }

    return null;
  }

  /**
   * Calculate technical indicators for current position
   */
  calculateIndicators(historicalData, currentIndex) {
    if (currentIndex < 14) return {};

    const recentData = historicalData.slice(Math.max(0, currentIndex - 50), currentIndex + 1);

    const indicators = {};

    // Calculate SMA
    if (recentData.length >= 20) {
      const sma20 = marketData.calculateIndicator(recentData, 'sma', 20);
      indicators.sma_20 = sma20[sma20.length - 1];
    }

    if (recentData.length >= 50) {
      const sma50 = marketData.calculateIndicator(recentData, 'sma', 50);
      indicators.sma_50 = sma50[sma50.length - 1];
    }

    // Calculate RSI
    if (recentData.length >= 14) {
      const rsi = marketData.calculateIndicator(recentData, 'rsi', 14);
      indicators.rsi = rsi[rsi.length - 1];
    }

    return indicators;
  }

  /**
   * Calculate performance metrics
   */
  calculateMetrics(results, initialCapital) {
    const { trades, finalBalance } = results;

    const totalReturn = finalBalance - initialCapital;
    const totalReturnPercent = (totalReturn / initialCapital) * 100;

    const winningTrades = trades.filter(t => t.pl && t.pl > 0);
    const losingTrades = trades.filter(t => t.pl && t.pl < 0);

    const totalTrades = trades.filter(t => t.side === 'sell').length;
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pl, 0) / winningTrades.length
      : 0;

    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pl, 0) / losingTrades.length)
      : 0;

    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(results.equityCurve);

    // Calculate Sharpe ratio
    const sharpeRatio = this.calculateSharpeRatio(results.equityCurve);

    return {
      initial_capital: initialCapital,
      final_capital: finalBalance,
      total_return: totalReturn,
      total_return_percent: totalReturnPercent,
      total_trades: totalTrades,
      winning_trades: winningTrades.length,
      losing_trades: losingTrades.length,
      win_rate: winRate,
      avg_win: avgWin,
      avg_loss: avgLoss,
      profit_factor: profitFactor,
      max_drawdown: maxDrawdown,
      sharpe_ratio: sharpeRatio
    };
  }

  /**
   * Calculate maximum drawdown
   */
  calculateMaxDrawdown(equityCurve) {
    let maxDrawdown = 0;
    let peak = equityCurve[0]?.total_value || 0;

    for (const point of equityCurve) {
      if (point.total_value > peak) {
        peak = point.total_value;
      }

      const drawdown = ((peak - point.total_value) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Calculate Sharpe ratio
   */
  calculateSharpeRatio(equityCurve) {
    if (equityCurve.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const ret = (equityCurve[i].total_value - equityCurve[i - 1].total_value) / equityCurve[i - 1].total_value;
      returns.push(ret);
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    const riskFreeRate = 0.02 / 252; // 2% annual risk-free rate, daily
    const sharpe = stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;

    return sharpe * Math.sqrt(252); // Annualized
  }

  /**
   * Save backtest results to database
   */
  async saveBacktest(userId, algorithmId, symbol, startDate, endDate, initialCapital, metrics, results) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO backtests
         (user_id, algorithm_id, symbol, start_date, end_date, initial_capital, final_capital,
          total_return, total_return_percent, total_trades, winning_trades, losing_trades,
          win_rate, max_drawdown, sharpe_ratio, results_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          algorithmId,
          symbol,
          startDate,
          endDate,
          initialCapital,
          metrics.final_capital,
          metrics.total_return,
          metrics.total_return_percent,
          metrics.total_trades,
          metrics.winning_trades,
          metrics.losing_trades,
          metrics.win_rate,
          metrics.max_drawdown,
          metrics.sharpe_ratio,
          JSON.stringify({
            trades: results.trades,
            equity_curve: results.equityCurve,
            metrics
          })
        ],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Get backtest by ID
   */
  async getBacktest(backtestId, userId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM backtests WHERE id = ? AND user_id = ?`,
        [backtestId, userId],
        (err, backtest) => {
          if (err) return reject(err);

          if (backtest && backtest.results_json) {
            backtest.results = JSON.parse(backtest.results_json);
          }

          resolve(backtest);
        }
      );
    });
  }

  /**
   * Get all backtests for an algorithm
   */
  async getBacktestsByAlgorithm(algorithmId, userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM backtests
         WHERE algorithm_id = ? AND user_id = ?
         ORDER BY created_at DESC`,
        [algorithmId, userId],
        (err, backtests) => {
          if (err) return reject(err);
          resolve(backtests || []);
        }
      );
    });
  }

  /**
   * Calculate date range string
   */
  calculateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return '1mo';
    if (diffDays <= 30) return '1mo';
    if (diffDays <= 90) return '3mo';
    if (diffDays <= 180) return '6mo';
    if (diffDays <= 365) return '1y';
    if (diffDays <= 730) return '2y';
    return '5y';
  }
}

// Export singleton instance
export default new BacktestEngine();
