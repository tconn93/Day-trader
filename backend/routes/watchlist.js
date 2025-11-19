import express from 'express';
import { body, validationResult } from 'express-validator';
import Watchlist from '../models/Watchlist.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected - require authentication
router.use(authenticateToken);

// Get user's watchlist
router.get('/', async (req, res) => {
  try {
    const watchlist = await Watchlist.getUserWatchlist(req.user.id);
    res.json({ watchlist });
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add stock to watchlist
router.post(
  '/',
  [
    body('symbol').trim().notEmpty().isLength({ min: 1, max: 10 }),
    body('companyName').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { symbol, companyName } = req.body;

    try {
      // Check if stock is already in watchlist
      const exists = await Watchlist.isInWatchlist(req.user.id, symbol);
      if (exists) {
        return res.status(400).json({ error: 'Stock already in watchlist' });
      }

      const stock = await Watchlist.addStock(req.user.id, symbol, companyName || '');
      res.status(201).json({
        message: 'Stock added to watchlist',
        stock
      });
    } catch (error) {
      console.error('Add stock error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Remove stock from watchlist
router.delete('/:symbol', async (req, res) => {
  const { symbol } = req.params;

  try {
    const result = await Watchlist.removeStock(req.user.id, symbol);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Stock not found in watchlist' });
    }

    res.json({ message: 'Stock removed from watchlist' });
  } catch (error) {
    console.error('Remove stock error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if stock is in watchlist
router.get('/check/:symbol', async (req, res) => {
  const { symbol } = req.params;

  try {
    const exists = await Watchlist.isInWatchlist(req.user.id, symbol);
    res.json({ inWatchlist: exists });
  } catch (error) {
    console.error('Check watchlist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
