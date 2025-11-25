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
        // Parse numeric fields
        account.balance = parseFloat(account.balance);
        account.initial_balance = parseFloat(account.initial_balance);
        account.total_value = parseFloat(account.total_value);
        return account;
      }

      // Create new account with default balance
      res = await pool.query(
        `INSERT INTO paper_accounts (user_id, balance, initial_balance, total_value)
         VALUES ($1, 100000.00, 100000.00, 100000.00) RETURNING *`,
        [userId]
      );
      account = res.rows[0];
      // Parse numeric fields
      account.balance = parseFloat(account.balance);
      account.initial_balance = parseFloat(account.initial_balance);
      account.total_value = parseFloat(account.total_value);
      return account;
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
      const account = res.rows[0] || null;
      if (account) {
        // Parse numeric fields
        account.balance = parseFloat(account.balance);
        account.initial_balance = parseFloat(account.initial_balance);
        account.total_value = parseFloat(account.total_value);
      }
      return account;
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
        [parseFloat(newBalance), accountId]
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
        [parseFloat(totalValue), accountId]
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
        [parseFloat(account.initial_balance), accountId]
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
          (pa.total_value - pa.initial_balance)::NUMERIC as total_pl,
          ((pa.total_value - pa.initial_balance) / pa.initial_balance * 100)::NUMERIC(5,2) as total_pl_percent,
          (SELECT COUNT(*) FROM orders WHERE account_id = pa.id AND status = 'filled')::INTEGER as total_trades,
          (SELECT COUNT(*) FROM positions WHERE account_id = pa.id)::INTEGER as open_positions
         FROM paper_accounts pa
         WHERE pa.id = $1`,
        [accountId]
      );
      const stats = res.rows[0] || null;
      if (stats) {
        // Parse numeric fields
        stats.balance = parseFloat(stats.balance);
        stats.initial_balance = parseFloat(stats.initial_balance);
        stats.total_value = parseFloat(stats.total_value);
        stats.total_pl = parseFloat(stats.total_pl);
        stats.total_pl_percent = parseFloat(stats.total_pl_percent);
        stats.total_trades = parseInt(stats.total_trades);
        stats.open_positions = parseInt(stats.open_positions);
      }
      return stats;
    } catch (err) {
      throw err;
    }
  }
}

export default PaperAccount;
