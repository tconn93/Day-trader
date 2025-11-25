import pool from '../config/database.js';

/**
 * Paper Account Model
 * Manages virtual trading accounts for paper trading
 */

class PaperAccount {
  /**
   * Get or create paper account for user
   */
  static async getOrCreate(userId) {
    try {
      let res = await pool.query(
        'SELECT * FROM paper_accounts WHERE user_id = $1',
        [userId]
      );
      let account = res.rows[0];

      if (account) {
        return account;
      }

      // Create new account with default balance
      res = await pool.query(
        `INSERT INTO paper_accounts (user_id, balance, initial_balance, total_value)
         VALUES ($1, 100000.00, 100000.00, 100000.00) RETURNING *`,
        [userId]
      );
      return res.rows[0];
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get account by ID
   */
  static async getById(accountId) {
    try {
      const res = await pool.query(
        'SELECT * FROM paper_accounts WHERE id = $1',
        [accountId]
      );
      return res.rows[0] || null;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Update account balance
   */
  static async updateBalance(accountId, newBalance) {
    try {
      await pool.query(
        `UPDATE paper_accounts
         SET balance = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newBalance, accountId]
      );
    } catch (err) {
      throw err;
    }
  }

  /**
   * Update total account value (balance + positions value)
   */
  static async updateTotalValue(accountId, totalValue) {
    try {
      await pool.query(
        `UPDATE paper_accounts
         SET total_value = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [totalValue, accountId]
      );
    } catch (err) {
      throw err;
    }
  }

  /**
   * Reset account to initial balance
   */
  static async reset(accountId) {
    try {
      const res = await pool.query(
        'SELECT initial_balance FROM paper_accounts WHERE id = $1',
        [accountId]
      );
      const account = res.rows[0];

      if (!account) {
        throw new Error('Account not found');
      }

      await pool.query(
        `UPDATE paper_accounts
         SET balance = $1, total_value = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [account.initial_balance, accountId]
      );
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get account statistics
   */
  static async getStats(accountId) {
    try {
      const res = await pool.query(
        `SELECT
          pa.*,
          (pa.total_value - pa.initial_balance) as total_pl,
          ((pa.total_value - pa.initial_balance) / pa.initial_balance * 100) as total_pl_percent,
          (SELECT COUNT(*) FROM orders WHERE account_id = pa.id AND status = 'filled') as total_trades,
          (SELECT COUNT(*) FROM positions WHERE account_id = pa.id) as open_positions
         FROM paper_accounts pa
         WHERE pa.id = $1`,
        [accountId]
      );
      return res.rows[0] || null;
    } catch (err) {
      throw err;
    }
  }
}

export default PaperAccount;
