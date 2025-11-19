# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Day-trader is a full-stack trading application that allows users to monitor stocks through a personalized watchlist. The application features JWT-based authentication and provides a foundation for implementing trading algorithms.

## Technology Stack

**Backend:**
- Node.js with Express.js (ES modules)
- SQLite database
- JWT for authentication
- bcryptjs for password hashing
- express-validator for request validation

**Frontend:**
- React with Vite
- React Router for navigation
- Axios for API calls
- Context API for state management

## Project Structure

```
Day-trader/
├── backend/
│   ├── config/
│   │   └── database.js          # SQLite database setup and initialization
│   ├── models/
│   │   ├── User.js              # User model (create, find, verify password)
│   │   ├── Watchlist.js         # Watchlist model (add, remove, list stocks)
│   │   ├── TradingAlgorithm.js  # Trading algorithm model
│   │   └── AlgorithmRule.js     # Algorithm rules model
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Auth routes (register, login, me)
│   │   ├── watchlist.js         # Watchlist routes (CRUD operations)
│   │   └── algorithms.js        # Algorithm and rules routes
│   ├── server.js                # Main Express server
│   ├── .env                     # Environment variables (gitignored)
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── PrivateRoute.jsx # Protected route component
    │   ├── pages/
    │   │   ├── Login.jsx        # Login page
    │   │   ├── Register.jsx     # Registration page
    │   │   └── Dashboard.jsx    # Main dashboard with watchlist
    │   ├── context/
    │   │   └── AuthContext.jsx  # Authentication context provider
    │   ├── services/
    │   │   └── api.js           # Axios API service layer
    │   └── App.jsx              # Main app with routing
    ├── .env                     # Environment variables (gitignored)
    └── package.json
```

## Development Commands

### Backend

```bash
cd backend
npm install                      # Install dependencies
npm start                        # Start production server
npm run dev                      # Start dev server with hot reload
```

### Frontend

```bash
cd frontend
npm install                      # Install dependencies
npm run dev                      # Start development server (http://localhost:5173)
npm run build                    # Build for production
npm run preview                  # Preview production build
```

### Running the Full Application

1. Start the backend (runs on port 5000):
   ```bash
   cd backend && npm start
   ```

2. In a new terminal, start the frontend (runs on port 5173):
   ```bash
   cd frontend && npm run dev
   ```

3. Access the application at http://localhost:5173

### First-Time Setup

Before running the application for the first time:

1. Copy environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. **Important:** Update `backend/.env` with a secure JWT_SECRET (change from the default!)

3. The SQLite database (`backend/database.sqlite`) will be automatically created and initialized when you first start the backend server

## Database Schema

**Note:** The database file is auto-created at `backend/database.sqlite` on first server startup. All tables are initialized automatically via `config/database.js`.

### Users Table
- `id`: Primary key
- `email`: Unique user email
- `password`: Hashed password
- `name`: User's display name
- `created_at`: Account creation timestamp

### Watchlist Table
- `id`: Primary key
- `user_id`: Foreign key to users table
- `symbol`: Stock symbol (e.g., AAPL, GOOGL)
- `company_name`: Optional company name
- `added_at`: Timestamp when stock was added
- Unique constraint on (user_id, symbol)

### Trading Algorithms Table
- `id`: Primary key
- `user_id`: Foreign key to users table
- `name`: Algorithm name
- `description`: Optional description
- `is_active`: Boolean flag (0/1) for active status
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Algorithm Rules Table
- `id`: Primary key
- `algorithm_id`: Foreign key to trading_algorithms table (cascade delete)
- `rule_type`: Type of rule (e.g., 'entry', 'exit', 'stop_loss')
- `condition_field`: Field to evaluate (e.g., 'price', 'volume')
- `condition_operator`: Comparison operator (>, <, >=, <=, ==, !=)
- `condition_value`: Value to compare against
- `action`: Action to take when condition is met
- `order_index`: Order of rule execution
- `created_at`: Creation timestamp
- **Important:** Rules are automatically deleted when their parent algorithm is deleted (ON DELETE CASCADE)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Watchlist
- `GET /api/watchlist` - Get user's watchlist (protected)
- `POST /api/watchlist` - Add stock to watchlist (protected)
- `DELETE /api/watchlist/:symbol` - Remove stock from watchlist (protected)
- `GET /api/watchlist/check/:symbol` - Check if stock is in watchlist (protected)

### Trading Algorithms
- `GET /api/algorithms` - Get all user's algorithms (protected)
- `GET /api/algorithms/:id` - Get algorithm by ID with rules (protected)
- `POST /api/algorithms` - Create new algorithm (protected)
- `PUT /api/algorithms/:id` - Update algorithm (protected)
- `DELETE /api/algorithms/:id` - Delete algorithm (protected)
- `PATCH /api/algorithms/:id/toggle` - Toggle algorithm active status (protected)

### Algorithm Rules
- `POST /api/algorithms/:id/rules` - Add rule to algorithm (protected)
- `PUT /api/algorithms/:algorithmId/rules/:ruleId` - Update rule (protected)
- `DELETE /api/algorithms/:algorithmId/rules/:ruleId` - Delete rule (protected)

All protected routes require `Authorization: Bearer <token>` header.

## Architecture

### Authentication Flow
1. User registers/logs in via frontend
2. Backend validates credentials and generates JWT token
3. Token stored in localStorage on frontend
4. Axios interceptor adds token to all subsequent requests
5. Backend middleware verifies token on protected routes

### State Management
- **AuthContext**: Manages user authentication state globally
- User state persists across page refreshes via token in localStorage
- Automatic token validation on app load

### Data Flow
1. User actions trigger API calls via services/api.js
2. API service includes JWT token in request headers
3. Backend validates token and processes request
4. Response updates component state
5. UI re-renders with new data

## Environment Variables

**Backend (.env):**
- `PORT`: Server port (default: 5000)
- `JWT_SECRET`: Secret key for JWT signing (change in production!)
- `NODE_ENV`: Environment (development/production)

**Frontend (.env):**
- `VITE_API_URL`: Backend API URL (default: http://localhost:5000/api)

## Trading Algorithms

The application supports creating custom trading algorithms with configurable rules:

**Algorithm Structure:**
- Each algorithm belongs to a user and can be activated/deactivated
- Algorithms contain multiple rules that define trading logic
- Rules are executed in order (via order_index)

**Rule Components:**
- `rule_type`: Categorizes the rule (e.g., 'entry', 'exit', 'stop_loss')
- `condition_field`: The data field to evaluate (e.g., 'price', 'volume', 'rsi')
- `condition_operator`: Comparison operator (>, <, >=, <=, ==, !=)
- `condition_value`: The threshold value for comparison
- `action`: The action to execute when condition is met

**Example Use Case:**
Create a simple moving average crossover algorithm:
1. Create algorithm: "MA Crossover Strategy"
2. Add entry rule: IF price > 50_day_ma THEN buy
3. Add exit rule: IF price < 50_day_ma THEN sell
4. Activate algorithm to enable trading

## Future Enhancements

The following features are planned:
- Real-time stock price monitoring integration
- Algorithm execution engine for live trading
- Algorithm backtesting with historical data
- Portfolio tracking and analytics
- Paper trading mode for algorithm testing
- Performance metrics and reporting

## Security Notes

- JWT tokens expire after 7 days
- Passwords are hashed with bcrypt (10 rounds)
- All watchlist operations require authentication
- CORS enabled for frontend-backend communication
- Input validation on all endpoints via express-validator
