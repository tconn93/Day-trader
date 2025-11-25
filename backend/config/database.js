import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PWORD,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const initializeDatabase = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Watchlist table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol VARCHAR(10) NOT NULL,
        company_name VARCHAR(255),
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, symbol)
      )
    `);

    // Trading algorithms table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trading_algorithms (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Algorithm rules table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS algorithm_rules (
        id SERIAL PRIMARY KEY,
        algorithm_id INTEGER NOT NULL REFERENCES trading_algorithms(id) ON DELETE CASCADE,
        rule_type VARCHAR(50) NOT NULL,
        condition_field VARCHAR(100) NOT NULL,
        condition_operator VARCHAR(10) NOT NULL,
        condition_value TEXT NOT NULL,
        action VARCHAR(50) NOT NULL,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Paper accounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS paper_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        balance NUMERIC(15,2) DEFAULT 100000.00,
        initial_balance NUMERIC(15,2) DEFAULT 100000.00,
        total_value NUMERIC(15,2) DEFAULT 100000.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        account_id INTEGER NOT NULL REFERENCES paper_accounts(id),
        algorithm_id INTEGER REFERENCES trading_algorithms(id),
        symbol VARCHAR(10) NOT NULL,
        type VARCHAR(20) NOT NULL,
        side VARCHAR(10) NOT NULL,
        quantity INTEGER NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        filled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Positions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        account_id INTEGER NOT NULL REFERENCES paper_accounts(id),
        symbol VARCHAR(10) NOT NULL,
        quantity INTEGER NOT NULL,
        average_price NUMERIC(10,2) NOT NULL,
        current_price NUMERIC(10,2),
        market_value NUMERIC(15,2),
        unrealized_pl NUMERIC(15,2),
        unrealized_pl_percent NUMERIC(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(account_id, symbol)
      )
    `);

    // Transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        account_id INTEGER NOT NULL REFERENCES paper_accounts(id),
        order_id INTEGER REFERENCES orders(id),
        type VARCHAR(20) NOT NULL,
        symbol VARCHAR(10),
        quantity INTEGER,
        price NUMERIC(10,2),
        amount NUMERIC(15,2) NOT NULL,
        balance_after NUMERIC(15,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Backtests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS backtests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        algorithm_id INTEGER NOT NULL REFERENCES trading_algorithms(id),
        symbol VARCHAR(10) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        initial_capital NUMERIC(15,2) NOT NULL,
        final_capital NUMERIC(15,2) NOT NULL,
        total_return NUMERIC(15,2) NOT NULL,
        total_return_percent NUMERIC(5,2) NOT NULL,
        total_trades INTEGER DEFAULT 0,
        winning_trades INTEGER DEFAULT 0,
        losing_trades INTEGER DEFAULT 0,
        win_rate NUMERIC(5,2),
        max_drawdown NUMERIC(5,2),
        sharpe_ratio NUMERIC(5,2),
        results_json JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('PostgreSQL database tables initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
};

export default pool;
