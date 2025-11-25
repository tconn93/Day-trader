import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken as auth } from '../middleware/auth.js';
import PaperAccount from '../models/PaperAccount.js';
import Order from '../models/Order.js';
import Position from '../models/Position.js';
import Transaction from '../models/Transaction.js';
import marketData from '../services/marketData.js';
import executionEngine from '../services/executionEngine.js';

const router = express.Router();

/**
 * Get or create paper trading account
 */
router.get('/account', auth, async (req, res) => {
  try {
    const account = await PaperAccount.getOrCreate(req.user.id);

    // Get positions
    const positions = await Position.getByAccount(account.id);

    // Update positions with current prices
    if (positions.length > 0) {
      const symbols = positions.map(p => p.symbol);
      const quotes = await marketData.getMultipleQuotes(symbols);

      for (const position of positions) {
        if (quotes[position.symbol]) {
          await Position.updateMarketValue(account.id, position.symbol, quotes[position.symbol].price);
        }
      }

      // Recalculate total value
      const positionsValue = await Position.getTotalValue(account.id);
      const totalValue = parseFloat(account.balance) + parseFloat(positionsValue);
      await PaperAccount.updateTotalValue(account.id, totalValue);
    }

    // Get updated account with stats
    const stats = await PaperAccount.getStats(account.id);

    res.json(stats);
  } catch (error) {
    console.error('Error getting paper account:', error);
    res.status(500).json({ error: 'Failed to get account' });
  }
});

/**
 * Get account positions
 */
router.get('/positions', auth, async (req, res) => {
  try {
    const account = await PaperAccount.getOrCreate(req.user.id);
    const positions = await Position.getByAccount(account.id);

    // Update with current prices
    if (positions.length > 0) {
      const symbols = positions.map(p => p.symbol);
      const quotes = await marketData.getMultipleQuotes(symbols);

      for (const position of positions) {
        if (quotes[position.symbol]) {
          await Position.updateMarketValue(account.id, position.symbol, quotes[position.symbol].price);
        }
      }

      // Get updated positions
      const updatedPositions = await Position.getByAccount(account.id);
      res.json(updatedPositions);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error getting positions:', error);
    res.status(500).json({ error: 'Failed to get positions' });
  }
});

/**
 * Get orders history
 */
router.get('/orders', auth, async (req, res) => {
  try {
    const account = await PaperAccount.getOrCreate(req.user.id);
    const limit = parseInt(req.query.limit) || 100;
    const orders = await Order.getByAccount(account.id, limit);

    res.json(orders);
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

/**
 * Get transactions history
 */
router.get('/transactions', auth, async (req, res) => {
  try {
    const account = await PaperAccount.getOrCreate(req.user.id);
    const limit = parseInt(req.query.limit) || 100;
    const transactions = await Transaction.getByAccount(account.id, limit);

    res.json(transactions);
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

/**
 * Place a manual order
 */
router.post(
  '/orders',
  auth,
  [
    body('symbol').notEmpty().trim().toUpperCase(),
    body('side').isIn(['buy', 'sell']),
    body('quantity').isInt({ min: 1 }),
    body('type').optional().isIn(['market', 'limit']).default('market')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { symbol, side, quantity, type } = req.body;

      const account = await PaperAccount.getOrCreate(req.user.id);

      // Get current price
      const quote = await marketData.getQuote(symbol);
      const price = parseFloat(quote.price);

      if (side === 'buy') {
        const totalCost = parseInt(quantity) * price;

        if (parseFloat(account.balance) < totalCost) {
          return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Execute buy
        await executionEngine.executeBuy(req.user.id, account.id, null, symbol, parseInt(quantity), price);
      } else {
        // Check position
        const position = await Position.getBySymbol(account.id, symbol);

        if (!position || parseInt(position.quantity) < parseInt(quantity)) {
          return res.status(400).json({ error: 'Insufficient shares' });
        }

        // Execute sell
        await executionEngine.executeSell(req.user.id, account.id, null, symbol, parseInt(quantity), price);
      }

      res.json({ success: true, message: 'Order executed' });
    } catch (error) {
      console.error('Error placing order:', error);
      res.status(500).json({ error: 'Failed to place order' });
    }
  }
);

/**
 * Reset paper trading account
 */
router.post('/account/reset', auth, async (req, res) => {
  try {
    const account = await PaperAccount.getOrCreate(req.user.id);

    // Clear positions
    await Position.clearAll(account.id);

    // Clear transactions
    await Transaction.clearAll(account.id);

    // Reset account balance
    await PaperAccount.reset(account.id);

    res.json({ success: true, message: 'Account reset successfully' });
  } catch (error) {
    console.error('Error resetting account:', error);
    res.status(500).json({ error: 'Failed to reset account' });
  }
});

/**
 * Get portfolio summary
 */
router.get('/portfolio', auth, async (req, res) => {
  try {
    const account = await PaperAccount.getOrCreate(req.user.id);
    const positions = await Position.getByAccount(account.id);

    // Update positions with current prices
    if (positions.length > 0) {
      const symbols = positions.map(p => p.symbol);
      const quotes = await marketData.getMultipleQuotes(symbols);

      for (const position of positions) {
        if (quotes[position.symbol]) {
          await Position.updateMarketValue(account.id, position.symbol, quotes[position.symbol].price);
        }
      }

      // Recalculate total value after updating positions
      const positionsValue = await Position.getTotalValue(account.id);
      const totalValue = parseFloat(account.balance) + parseFloat(positionsValue);
      await PaperAccount.updateTotalValue(account.id, totalValue);
    }

    // Get updated data
    const updatedPositions = await Position.getByAccount(account.id);
    const positionsStats = await Position.getStats(account.id);
    const orderStats = await Order.getStats(account.id);
    const transactionStats = await Transaction.getStats(account.id);
    const accountStats = await PaperAccount.getStats(account.id);

    res.json({
      account: accountStats,
      positions: updatedPositions,
      stats: {
        ...positionsStats,
        ...orderStats,
        ...transactionStats
      }
    });
  } catch (error) {
    console.error('Error getting portfolio:', error);
    res.status(500).json({ error: 'Failed to get portfolio', details: error.message });
  }
});

/**
 * Start algorithm execution
 */
router.post(
  '/algorithms/:id/start',
  auth,
  [
    param('id').isInt(),
    body('symbols').optional().isArray()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const algorithmId = parseInt(req.params.id);
      const symbols = req.body.symbols || [];

      await executionEngine.startAlgorithm(algorithmId, req.user.id, symbols);

      res.json({ success: true, message: 'Algorithm started' });
    } catch (error) {
      console.error('Error starting algorithm:', error);
      res.status(500).json({ error: error.message || 'Failed to start algorithm' });
    }
  }
);

/**
 * Stop algorithm execution
 */
router.post('/algorithms/:id/stop', auth, param('id').isInt(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const algorithmId = parseInt(req.params.id);

    executionEngine.stopAlgorithm(algorithmId);

    res.json({ success: true, message: 'Algorithm stopped' });
  } catch (error) {
    console.error('Error stopping algorithm:', error);
    res.status(500).json({ error: 'Failed to stop algorithm' });
  }
});

/**
 * Get running algorithms
 */
router.get('/algorithms/running', auth, async (req, res) => {
  try {
    const running = executionEngine.getRunningAlgorithms();
    res.json(running);
  } catch (error) {
    console.error('Error getting running algorithms:', error);
    res.status(500).json({ error: 'Failed to get running algorithms' });
  }
});

export default router;
