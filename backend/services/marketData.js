import axios from 'axios';

/**
 * Market Data Service
 * Provides real-time and historical stock price data
 * Uses Yahoo Finance API (free, no API key required)
 */

class MarketDataService {
  constructor() {
    this.baseURL = 'https://query1.finance.yahoo.com/v8/finance';
    this.cache = new Map();
    this.cacheDuration = 60000; // 1 minute cache
  }

  /**
   * Get current quote for a symbol
   * @param {string} symbol - Stock symbol (e.g., 'AAPL')
   * @returns {Promise<Object>} Quote data
   */
  async getQuote(symbol) {
    const cacheKey = `quote_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseURL}/chart/${symbol}`, {
        params: {
          interval: '1d',
          range: '1d'
        }
      });

      const result = response.data.chart.result[0];
      const meta = result.meta;
      const quote = result.indicators.quote[0];

      const data = {
        symbol: meta.symbol,
        price: meta.regularMarketPrice,
        previousClose: meta.chartPreviousClose,
        open: quote.open[quote.open.length - 1],
        high: quote.high[quote.high.length - 1],
        low: quote.low[quote.low.length - 1],
        volume: quote.volume[quote.volume.length - 1],
        timestamp: new Date(meta.regularMarketTime * 1000),
        change: meta.regularMarketPrice - meta.chartPreviousClose,
        changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
      };

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error.message);

      // Return mock data in case of API failure (for development)
      return this.getMockQuote(symbol);
    }
  }

  /**
   * Get historical data for backtesting
   * @param {string} symbol - Stock symbol
   * @param {string} range - Time range (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
   * @param {string} interval - Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)
   * @returns {Promise<Array>} Historical data points
   */
  async getHistoricalData(symbol, range = '1y', interval = '1d') {
    const cacheKey = `hist_${symbol}_${range}_${interval}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseURL}/chart/${symbol}`, {
        params: { interval, range }
      });

      const result = response.data.chart.result[0];
      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];

      const data = timestamps.map((timestamp, index) => ({
        timestamp: new Date(timestamp * 1000),
        open: quote.open[index],
        high: quote.high[index],
        low: quote.low[index],
        close: quote.close[index],
        volume: quote.volume[index]
      })).filter(d => d.close !== null); // Filter out null values

      this.setCache(cacheKey, data, 3600000); // Cache for 1 hour
      return data;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error.message);

      // Return mock data in case of API failure
      return this.getMockHistoricalData(symbol, range);
    }
  }

  /**
   * Get multiple quotes at once
   * @param {Array<string>} symbols - Array of stock symbols
   * @returns {Promise<Object>} Map of symbol to quote data
   */
  async getMultipleQuotes(symbols) {
    const quotes = await Promise.all(
      symbols.map(symbol => this.getQuote(symbol))
    );

    return symbols.reduce((acc, symbol, index) => {
      acc[symbol] = quotes[index];
      return acc;
    }, {});
  }

  /**
   * Calculate technical indicators
   * @param {Array} historicalData - Historical price data
   * @param {string} indicator - Indicator type (sma, ema, rsi)
   * @param {number} period - Period for calculation
   * @returns {Array} Indicator values
   */
  calculateIndicator(historicalData, indicator, period = 14) {
    switch (indicator) {
      case 'sma':
        return this.calculateSMA(historicalData, period);
      case 'ema':
        return this.calculateEMA(historicalData, period);
      case 'rsi':
        return this.calculateRSI(historicalData, period);
      default:
        throw new Error(`Unknown indicator: ${indicator}`);
    }
  }

  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(data, period) {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
        continue;
      }

      const sum = data.slice(i - period + 1, i + 1)
        .reduce((acc, d) => acc + d.close, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(data, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);

    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i].close;
      ema.push(null);
    }
    ema[period - 1] = sum / period;

    // Calculate EMA for remaining data
    for (let i = period; i < data.length; i++) {
      ema[i] = (data[i].close - ema[i - 1]) * multiplier + ema[i - 1];
    }

    return ema;
  }

  /**
   * Calculate Relative Strength Index
   */
  calculateRSI(data, period = 14) {
    const rsi = [];
    const gains = [];
    const losses = [];

    // Calculate price changes
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        gains.push(0);
        losses.push(0);
        rsi.push(null);
        continue;
      }

      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
      rsi.push(null);
    }

    // Calculate initial average gain/loss
    if (data.length > period) {
      let avgGain = gains.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
      let avgLoss = losses.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;

      const rs = avgGain / avgLoss;
      rsi[period] = 100 - (100 / (1 + rs));

      // Calculate RSI for remaining data
      for (let i = period + 1; i < data.length; i++) {
        avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
        avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;

        const rs = avgGain / avgLoss;
        rsi[i] = 100 - (100 / (1 + rs));
      }
    }

    return rsi;
  }

  /**
   * Mock data for development/testing
   */
  getMockQuote(symbol) {
    const basePrice = 100 + Math.random() * 400;
    const change = (Math.random() - 0.5) * 10;

    return {
      symbol,
      price: basePrice + change,
      previousClose: basePrice,
      open: basePrice + (Math.random() - 0.5) * 5,
      high: basePrice + Math.random() * 10,
      low: basePrice - Math.random() * 10,
      volume: Math.floor(Math.random() * 10000000),
      timestamp: new Date(),
      change,
      changePercent: (change / basePrice) * 100
    };
  }

  getMockHistoricalData(symbol, range) {
    const days = range === '1mo' ? 30 : range === '3mo' ? 90 : range === '6mo' ? 180 : 365;
    const data = [];
    let price = 100 + Math.random() * 400;
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const timestamp = new Date(now);
      timestamp.setDate(timestamp.getDate() - i);

      const volatility = price * 0.02;
      const change = (Math.random() - 0.5) * volatility;
      price = Math.max(10, price + change);

      const open = price + (Math.random() - 0.5) * volatility * 0.5;
      const high = Math.max(open, price) + Math.random() * volatility * 0.5;
      const low = Math.min(open, price) - Math.random() * volatility * 0.5;

      data.push({
        timestamp,
        open,
        high,
        low,
        close: price,
        volume: Math.floor(Math.random() * 10000000)
      });
    }

    return data;
  }

  /**
   * Cache management
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.duration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  setCache(key, data, duration = this.cacheDuration) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      duration
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export default new MarketDataService();
