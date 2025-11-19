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

export default api;
