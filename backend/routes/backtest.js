import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken as auth } from '../middleware/auth.js';
import backtestEngine from '../services/backtestEngine.js';

const router = express.Router();

/**
 * Run a backtest
 */
router.post(
  '/run',
  auth,
  [
    body('algorithmId').isInt(),
    body('symbol').notEmpty().trim().toUpperCase(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('initialCapital').optional().isFloat({ min: 1000 }).default(100000),
    body('interval').optional().isIn(['1d', '1h', '30m', '15m', '5m']).default('1d')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { algorithmId, symbol, startDate, endDate, initialCapital, interval } = req.body;

      // Validate date range
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return res.status(400).json({ error: 'Start date must be before end date' });
      }

      if (end > new Date()) {
        return res.status(400).json({ error: 'End date cannot be in the future' });
      }

      // Run backtest
      const results = await backtestEngine.runBacktest(
        algorithmId,
        req.user.id,
        {
          symbol,
          startDate,
          endDate,
          initialCapital,
          interval
        }
      );

      res.json(results);
    } catch (error) {
      console.error('Error running backtest:', error);
      res.status(500).json({ error: error.message || 'Failed to run backtest' });
    }
  }
);

/**
 * Get backtest by ID
 */
router.get('/:id', auth, param('id').isInt(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const backtestId = parseInt(req.params.id);
    const backtest = await backtestEngine.getBacktest(backtestId, req.user.id);

    if (!backtest) {
      return res.status(404).json({ error: 'Backtest not found' });
    }

    res.json(backtest);
  } catch (error) {
    console.error('Error getting backtest:', error);
    res.status(500).json({ error: 'Failed to get backtest' });
  }
});

/**
 * Get backtests for an algorithm
 */
router.get('/algorithm/:algorithmId', auth, param('algorithmId').isInt(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const algorithmId = parseInt(req.params.algorithmId);
    const backtests = await backtestEngine.getBacktestsByAlgorithm(algorithmId, req.user.id);

    res.json(backtests);
  } catch (error) {
    console.error('Error getting backtests:', error);
    res.status(500).json({ error: 'Failed to get backtests' });
  }
});

export default router;
