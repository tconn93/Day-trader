import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (email, password, name) =>
    api.post('/auth/register', { email, password, name }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  getCurrentUser: () =>
    api.get('/auth/me')
};

// Watchlist API
export const watchlistAPI = {
  getWatchlist: () =>
    api.get('/watchlist'),

  addStock: (symbol, companyName) =>
    api.post('/watchlist', { symbol, companyName }),

  removeStock: (symbol) =>
    api.delete(`/watchlist/${symbol}`),

  checkStock: (symbol) =>
    api.get(`/watchlist/check/${symbol}`)
};

// Algorithms API
export const algorithmsAPI = {
  getAll: () =>
    api.get('/algorithms'),

  getById: (id) =>
    api.get(`/algorithms/${id}`),

  create: (name, description) =>
    api.post('/algorithms', { name, description }),

  update: (id, name, description) =>
    api.put(`/algorithms/${id}`, { name, description }),

  delete: (id) =>
    api.delete(`/algorithms/${id}`),

  toggle: (id) =>
    api.patch(`/algorithms/${id}/toggle`),

  addRule: (id, ruleData) =>
    api.post(`/algorithms/${id}/rules`, ruleData),

  updateRule: (algorithmId, ruleId, ruleData) =>
    api.put(`/algorithms/${algorithmId}/rules/${ruleId}`, ruleData),

  deleteRule: (algorithmId, ruleId) =>
    api.delete(`/algorithms/${algorithmId}/rules/${ruleId}`)
};

// Paper Trading API
export const paperTradingAPI = {
  getAccount: () =>
    api.get('/paper-trading/account'),

  getPositions: () =>
    api.get('/paper-trading/positions'),

  getOrders: (limit = 100) =>
    api.get(`/paper-trading/orders?limit=${limit}`),

  getTransactions: (limit = 100) =>
    api.get(`/paper-trading/transactions?limit=${limit}`),

  placeOrder: (symbol, side, quantity, type = 'market') =>
    api.post('/paper-trading/orders', { symbol, side, quantity, type }),

  resetAccount: () =>
    api.post('/paper-trading/account/reset'),

  getPortfolio: () =>
    api.get('/paper-trading/portfolio'),

  startAlgorithm: (id, symbols = []) =>
    api.post(`/paper-trading/algorithms/${id}/start`, { symbols }),

  stopAlgorithm: (id) =>
    api.post(`/paper-trading/algorithms/${id}/stop`),

  getRunningAlgorithms: () =>
    api.get('/paper-trading/algorithms/running')
};

// Backtest API
export const backtestAPI = {
  run: (algorithmId, symbol, startDate, endDate, initialCapital = 100000, interval = '1d') =>
    api.post('/backtest/run', {
      algorithmId,
      symbol,
      startDate,
      endDate,
      initialCapital,
      interval
    }),

  getById: (id) =>
    api.get(`/backtest/${id}`),

  getByAlgorithm: (algorithmId) =>
    api.get(`/backtest/algorithm/${algorithmId}`)
};

export default api;
