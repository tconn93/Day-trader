import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create database connection
const db = new sqlite3.Database(join(__dirname, '..', 'database.sqlite'), (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database tables
export const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
        }
      });

      // Watchlist table
      db.run(`
        CREATE TABLE IF NOT EXISTS watchlist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          symbol TEXT NOT NULL,
          company_name TEXT,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(user_id, symbol)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating watchlist table:', err);
          reject(err);
        }
      });

      // Trading algorithms table
      db.run(`
        CREATE TABLE IF NOT EXISTS trading_algorithms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          is_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating trading_algorithms table:', err);
          reject(err);
        }
      });

      // Algorithm rules table
      db.run(`
        CREATE TABLE IF NOT EXISTS algorithm_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          algorithm_id INTEGER NOT NULL,
          rule_type TEXT NOT NULL,
          condition_field TEXT NOT NULL,
          condition_operator TEXT NOT NULL,
          condition_value TEXT NOT NULL,
          action TEXT NOT NULL,
          order_index INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (algorithm_id) REFERENCES trading_algorithms(id) ON DELETE CASCADE
        )
      `);

      // Paper trading accounts table
      db.run(`
        CREATE TABLE IF NOT EXISTS paper_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          balance REAL DEFAULT 100000.00,
          initial_balance REAL DEFAULT 100000.00,
          total_value REAL DEFAULT 100000.00,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Orders table
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          account_id INTEGER NOT NULL,
          algorithm_id INTEGER,
          symbol TEXT NOT NULL,
          type TEXT NOT NULL,
          side TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          filled_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (account_id) REFERENCES paper_accounts(id),
          FOREIGN KEY (algorithm_id) REFERENCES trading_algorithms(id)
        )
      `);

      // Positions table
      db.run(`
        CREATE TABLE IF NOT EXISTS positions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          account_id INTEGER NOT NULL,
          symbol TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          average_price REAL NOT NULL,
          current_price REAL,
          market_value REAL,
          unrealized_pl REAL,
          unrealized_pl_percent REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (account_id) REFERENCES paper_accounts(id),
          UNIQUE(account_id, symbol)
        )
      `);

      // Transactions table
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          account_id INTEGER NOT NULL,
          order_id INTEGER,
          type TEXT NOT NULL,
          symbol TEXT,
          quantity INTEGER,
          price REAL,
          amount REAL NOT NULL,
          balance_after REAL NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (account_id) REFERENCES paper_accounts(id),
          FOREIGN KEY (order_id) REFERENCES orders(id)
        )
      `);

      // Backtests table
      db.run(`
        CREATE TABLE IF NOT EXISTS backtests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          algorithm_id INTEGER NOT NULL,
          symbol TEXT NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          initial_capital REAL NOT NULL,
          final_capital REAL NOT NULL,
          total_return REAL NOT NULL,
          total_return_percent REAL NOT NULL,
          total_trades INTEGER DEFAULT 0,
          winning_trades INTEGER DEFAULT 0,
          losing_trades INTEGER DEFAULT 0,
          win_rate REAL,
          max_drawdown REAL,
          sharpe_ratio REAL,
          results_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (algorithm_id) REFERENCES trading_algorithms(id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating backtests table:', err);
          reject(err);
        } else {
          console.log('Database tables initialized');
          resolve();
        }
      });
    });
  });
};

export default db;
