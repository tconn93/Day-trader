# Day Trader

A full-stack trading application that allows users to monitor stocks through a personalized watchlist with plans for implementing automated trading algorithms.

## Features

- **User Authentication**: Secure JWT-based authentication
- **Stock Watchlist**: Add and monitor your favorite stocks
- **Real-time Dashboard**: Manage your watchlist with an intuitive UI
- **Secure Backend API**: RESTful API with protected endpoints

## Tech Stack

**Backend:**
- Express.js (Node.js)
- SQLite database
- JWT authentication
- bcryptjs for password hashing

**Frontend:**
- React with Vite
- React Router
- Axios for API calls
- Context API for state management

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tconn93/Day-trader.git
   cd Day-trader
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env and set JWT_SECRET to a secure random string
   ```

3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. Start the backend server (from the `backend` directory):
   ```bash
   cd backend
   npm start
   ```
   The backend will run on http://localhost:5000

2. In a new terminal, start the frontend (from the `frontend` directory):
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on http://localhost:5173

3. Open your browser and navigate to http://localhost:5173

### First Time Setup

1. Click "Register" to create a new account
2. Enter your name, email, and password
3. Once registered, you'll be automatically logged in
4. Start adding stocks to your watchlist!

## API Documentation

See the backend server root endpoint (http://localhost:5000) for API documentation.

## Project Structure

```
Day-trader/
├── backend/          # Express.js backend
│   ├── config/      # Database configuration
│   ├── models/      # Data models
│   ├── routes/      # API routes
│   ├── middleware/  # Authentication middleware
│   └── server.js    # Main server file
│
└── frontend/        # React frontend
    ├── src/
    │   ├── components/  # React components
    │   ├── pages/       # Page components
    │   ├── context/     # Context providers
    │   └── services/    # API services
    └── ...
```

## Future Enhancements

- Trading Algorithm implementation
- Algorithm Rules engine
- Real-time stock price data
- Portfolio tracking
- Trading strategy backtesting
- Advanced analytics

## License

See LICENSE file for details.
