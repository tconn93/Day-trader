import db from '../config/database.js';

/**
 * Transaction Model
 * Tracks all financial transactions in paper trading accounts
 */

class Transaction {
  /**
   * Create a new transaction
   */
  static async create(transactionData) {
    const {
      userId,
      accountId,
      orderId,
      type,
      symbol,
      quantity,
      price,
      amount,
      balanceAfter,
      description
    } = transactionData;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO transactions
         (user_id, account_id, order_id, type, symbol, quantity, price, amount, balance_after, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, accountId, orderId || null, type, symbol || null, quantity || null, price || null, amount, balanceAfter, description || null],
        function(err) {
          if (err) return reject(err);

          resolve({
            id: this.lastID,
            ...transactionData,
            created_at: new Date().toISOString()
          });
        }
      );
    });
  }

  /**
   * Get transaction by ID
   */
  static async getById(transactionId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM transactions WHERE id = ?',
        [transactionId],
        (err, transaction) => {
          if (err) return reject(err);
          resolve(transaction);
        }
      );
    });
  }

  /**
   * Get all transactions for an account
   */
  static async getByAccount(accountId, limit = 100) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM transactions
         WHERE account_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [accountId, limit],
        (err, transactions) => {
          if (err) return reject(err);
          resolve(transactions || []);
        }
      );
    });
  }

  /**
   * Get transactions by type
   */
  static async getByType(accountId, type, limit = 100) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM transactions
         WHERE account_id = ? AND type = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [accountId, type, limit],
        (err, transactions) => {
          if (err) return reject(err);
          resolve(transactions || []);
        }
      );
    });
  }

  /**
   * Get transactions for a specific symbol
   */
  static async getBySymbol(accountId, symbol, limit = 50) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM transactions
         WHERE account_id = ? AND symbol = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [accountId, symbol, limit],
        (err, transactions) => {
          if (err) return reject(err);
          resolve(transactions || []);
        }
      );
    });
  }

  /**
   * Get transactions for a date range
   */
  static async getByDateRange(accountId, startDate, endDate) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM transactions
         WHERE account_id = ?
         AND created_at BETWEEN ? AND ?
         ORDER BY created_at DESC`,
        [accountId, startDate, endDate],
        (err, transactions) => {
          if (err) return reject(err);
          resolve(transactions || []);
        }
      );
    });
  }

  /**
   * Get transaction statistics
   */
  static async getStats(accountId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT
          COUNT(*) as total_transactions,
          SUM(CASE WHEN type = 'buy' THEN 1 ELSE 0 END) as total_buys,
          SUM(CASE WHEN type = 'sell' THEN 1 ELSE 0 END) as total_sells,
          SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
          SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
          SUM(CASE WHEN type = 'buy' THEN amount ELSE 0 END) as total_buy_amount,
          SUM(CASE WHEN type = 'sell' THEN amount ELSE 0 END) as total_sell_amount
         FROM transactions
         WHERE account_id = ?`,
        [accountId],
        (err, stats) => {
          if (err) return reject(err);
          resolve(stats);
        }
      );
    });
  }

  /**
   * Clear all transactions (for account reset)
   */
  static async clearAll(accountId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM transactions WHERE account_id = ?',
        [accountId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }
}

export default Transaction;
