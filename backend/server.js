import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import watchlistRoutes from './routes/watchlist.js';
import algorithmsRoutes from './routes/algorithms.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/algorithms', algorithmsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Day-trader API is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Day-trader API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      watchlist: {
        list: 'GET /api/watchlist',
        add: 'POST /api/watchlist',
        remove: 'DELETE /api/watchlist/:symbol',
        check: 'GET /api/watchlist/check/:symbol'
      },
      algorithms: {
        list: 'GET /api/algorithms',
        get: 'GET /api/algorithms/:id',
        create: 'POST /api/algorithms',
        update: 'PUT /api/algorithms/:id',
        delete: 'DELETE /api/algorithms/:id',
        toggle: 'PATCH /api/algorithms/:id/toggle',
        addRule: 'POST /api/algorithms/:id/rules',
        updateRule: 'PUT /api/algorithms/:algorithmId/rules/:ruleId',
        deleteRule: 'DELETE /api/algorithms/:algorithmId/rules/:ruleId'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`API Documentation: http://localhost:${PORT}/`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

export default app;
