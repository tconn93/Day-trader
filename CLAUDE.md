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
│   │   └── Watchlist.js         # Watchlist model (add, remove, list stocks)
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Auth routes (register, login, me)
│   │   └── watchlist.js         # Watchlist routes (CRUD operations)
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

## Database Schema

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

## Future Enhancements

The following features are planned:
- Trading Algorithm models with AlgorithmRules
- Real-time stock price monitoring
- Trading strategy implementation
- Algorithm backtesting capabilities
- Portfolio tracking and analytics

## Security Notes

- JWT tokens expire after 7 days
- Passwords are hashed with bcrypt (10 rounds)
- All watchlist operations require authentication
- CORS enabled for frontend-backend communication
- Input validation on all endpoints via express-validator
