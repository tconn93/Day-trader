import db from '../config/database.js';

/**
 * Paper Account Model
 * Manages virtual trading accounts for paper trading
 */

class PaperAccount {
  /**
   * Get or create paper account for user
   */
  static async getOrCreate(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM paper_accounts WHERE user_id = ?',
        [userId],
        (err, account) => {
          if (err) {
            return reject(err);
          }

          if (account) {
            return resolve(account);
          }

          // Create new account with default balance
          db.run(
            `INSERT INTO paper_accounts (user_id, balance, initial_balance, total_value)
             VALUES (?, 100000.00, 100000.00, 100000.00)`,
            [userId],
            function(err) {
              if (err) {
                return reject(err);
              }

              resolve({
                id: this.lastID,
                user_id: userId,
                balance: 100000.00,
                initial_balance: 100000.00,
                total_value: 100000.00,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          );
        }
      );
    });
  }

  /**
   * Get account by ID
   */
  static async getById(accountId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM paper_accounts WHERE id = ?',
        [accountId],
        (err, account) => {
          if (err) return reject(err);
          resolve(account);
        }
      );
    });
  }

  /**
   * Update account balance
   */
  static async updateBalance(accountId, newBalance) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE paper_accounts
         SET balance = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newBalance, accountId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  /**
   * Update total account value (balance + positions value)
   */
  static async updateTotalValue(accountId, totalValue) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE paper_accounts
         SET total_value = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [totalValue, accountId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  /**
   * Reset account to initial balance
   */
  static async reset(accountId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT initial_balance FROM paper_accounts WHERE id = ?',
        [accountId],
        (err, account) => {
          if (err) return reject(err);

          db.run(
            `UPDATE paper_accounts
             SET balance = ?, total_value = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [account.initial_balance, account.initial_balance, accountId],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        }
      );
    });
  }

  /**
   * Get account statistics
   */
  static async getStats(accountId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT
          pa.*,
          (pa.total_value - pa.initial_balance) as total_pl,
          ((pa.total_value - pa.initial_balance) / pa.initial_balance * 100) as total_pl_percent,
          (SELECT COUNT(*) FROM orders WHERE account_id = pa.id AND status = 'filled') as total_trades,
          (SELECT COUNT(*) FROM positions WHERE account_id = pa.id) as open_positions
         FROM paper_accounts pa
         WHERE pa.id = ?`,
        [accountId],
        (err, stats) => {
          if (err) return reject(err);
          resolve(stats);
        }
      );
    });
  }
}

export default PaperAccount;
