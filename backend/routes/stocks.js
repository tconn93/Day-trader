import express from 'express';
import marketDataService from '../services/marketData.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

// Get quote for a single stock
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await marketDataService.getQuote(symbol.toUpperCase());
    res.json({ quote });
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ error: 'Failed to fetch stock quote' });
  }
});

// Get quotes for multiple stocks
router.post('/quotes', async (req, res) => {
  try {
    const { symbols } = req.body;

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Invalid symbols array' });
    }

    const quotes = await marketDataService.getMultipleQuotes(
      symbols.map(s => s.toUpperCase())
    );

    res.json({ quotes });
  } catch (error) {
    console.error('Get multiple quotes error:', error);
    res.status(500).json({ error: 'Failed to fetch stock quotes' });
  }
});

// Get historical data for a stock
router.get('/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = '1mo', interval = '1d' } = req.query;

    const data = await marketDataService.getHistoricalData(
      symbol.toUpperCase(),
      range,
      interval
    );

    res.json({ data });
  } catch (error) {
    console.error('Get historical data error:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

export default router;
