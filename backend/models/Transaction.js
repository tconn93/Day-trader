import pool from '../config/database.js';

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

    try {
      const res = await pool.query(
        `INSERT INTO transactions
         (user_id, account_id, order_id, type, symbol, quantity, price, amount, balance_after, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [userId, accountId, orderId || null, type, symbol || null, parseInt(quantity) || null, parseFloat(price) || null, parseFloat(amount), parseFloat(balanceAfter), description || null]
      );
      const transaction = { ...res.rows[0], created_at: res.rows[0].created_at.toISOString() };
      // Parse numeric fields
      transaction.quantity = parseInt(transaction.quantity || 0);
      transaction.price = parseFloat(transaction.price || 0);
      transaction.amount = parseFloat(transaction.amount);
      transaction.balance_after = parseFloat(transaction.balance_after);
      return transaction;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get transaction by ID
   */
  static async getById(transactionId) {
    try {
      const res = await pool.query(
        'SELECT * FROM transactions WHERE id = $1',
        [transactionId]
      );
      const transaction = res.rows[0] || null;
      if (transaction) {
        // Parse numeric fields
        transaction.quantity = parseInt(transaction.quantity || 0);
        transaction.price = parseFloat(transaction.price || 0);
        transaction.amount = parseFloat(transaction.amount);
        transaction.balance_after = parseFloat(transaction.balance_after);
      }
      return transaction;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all transactions for an account
   */
  static async getByAccount(accountId, limit = 100) {
    try {
      const res = await pool.query(
        `SELECT * FROM transactions
         WHERE account_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [accountId, parseInt(limit)]
      );
      res.rows.forEach(transaction => {
        // Parse numeric fields
        transaction.quantity = parseInt(transaction.quantity || 0);
        transaction.price = parseFloat(transaction.price || 0);
        transaction.amount = parseFloat(transaction.amount);
        transaction.balance_after = parseFloat(transaction.balance_after);
      });
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get transactions by type
   */
  static async getByType(accountId, type, limit = 100) {
    try {
      const res = await pool.query(
        `SELECT * FROM transactions
         WHERE account_id = $1 AND type = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [accountId, type, parseInt(limit)]
      );
      res.rows.forEach(transaction => {
        // Parse numeric fields
        transaction.quantity = parseInt(transaction.quantity || 0);
        transaction.price = parseFloat(transaction.price || 0);
        transaction.amount = parseFloat(transaction.amount);
        transaction.balance_after = parseFloat(transaction.balance_after);
      });
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get transactions for a specific symbol
   */
  static async getBySymbol(accountId, symbol, limit = 50) {
    try {
      const res = await pool.query(
        `SELECT * FROM transactions
         WHERE account_id = $1 AND symbol = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [accountId, symbol, parseInt(limit)]
      );
      res.rows.forEach(transaction => {
        // Parse numeric fields
        transaction.quantity = parseInt(transaction.quantity || 0);
        transaction.price = parseFloat(transaction.price || 0);
        transaction.amount = parseFloat(transaction.amount);
        transaction.balance_after = parseFloat(transaction.balance_after);
      });
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get transactions for a date range
   */
  static async getByDateRange(accountId, startDate, endDate) {
    try {
      const res = await pool.query(
        `SELECT * FROM transactions
         WHERE account_id = $1
         AND created_at BETWEEN $2 AND $3
         ORDER BY created_at DESC`,
        [accountId, startDate, endDate]
      );
      res.rows.forEach(transaction => {
        // Parse numeric fields
        transaction.quantity = parseInt(transaction.quantity || 0);
        transaction.price = parseFloat(transaction.price || 0);
        transaction.amount = parseFloat(transaction.amount);
        transaction.balance_after = parseFloat(transaction.balance_after);
      });
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get transaction statistics
   */
  static async getStats(accountId) {
    try {
      const res = await pool.query(
        `SELECT
          COUNT(*)::INTEGER as total_transactions,
          SUM(CASE WHEN type = 'buy' THEN 1 ELSE 0 END)::INTEGER as total_buys,
          SUM(CASE WHEN type = 'sell' THEN 1 ELSE 0 END)::INTEGER as total_sells,
          COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0)::NUMERIC as total_deposits,
          COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0)::NUMERIC as total_withdrawals,
          COALESCE(SUM(CASE WHEN type = 'buy' THEN amount ELSE 0 END), 0)::NUMERIC as total_buy_amount,
          COALESCE(SUM(CASE WHEN type = 'sell' THEN amount ELSE 0 END), 0)::NUMERIC as total_sell_amount
         FROM transactions
         WHERE account_id = $1`,
        [accountId]
      );
      const stats = res.rows[0];
      // Parse in JS
      stats.total_transactions = parseInt(stats.total_transactions);
      stats.total_buys = parseInt(stats.total_buys);
      stats.total_sells = parseInt(stats.total_sells);
      stats.total_deposits = parseFloat(stats.total_deposits);
      stats.total_withdrawals = parseFloat(stats.total_withdrawals);
      stats.total_buy_amount = parseFloat(stats.total_buy_amount);
      stats.total_sell_amount = parseFloat(stats.total_sell_amount);
      return stats;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Clear all transactions (for account reset)
   */
  static async clearAll(accountId) {
    try {
      await pool.query(
        'DELETE FROM transactions WHERE account_id = $1',
        [accountId]
      );
    } catch (err) {
      throw err;
    }
  }
}

export default Transaction;
