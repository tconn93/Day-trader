import db from '../config/database.js';

/**
 * Position Model
 * Manages stock positions in paper trading accounts
 */

class Position {
  /**
   * Create or update a position
   */
  static async upsert(positionData) {
    const { userId, accountId, symbol, quantity, averagePrice } = positionData;

    return new Promise((resolve, reject) => {
      // Check if position exists
      db.get(
        'SELECT * FROM positions WHERE account_id = ? AND symbol = ?',
        [accountId, symbol],
        (err, existing) => {
          if (err) return reject(err);

          if (existing) {
            // Update existing position
            const newQuantity = existing.quantity + quantity;

            if (newQuantity === 0) {
              // Close position if quantity is zero
              return this.close(accountId, symbol)
                .then(resolve)
                .catch(reject);
            }

            // Calculate new average price
            const totalCost = (existing.quantity * existing.average_price) + (quantity * averagePrice);
            const newAveragePrice = totalCost / newQuantity;

            db.run(
              `UPDATE positions
               SET quantity = ?,
                   average_price = ?,
                   updated_at = CURRENT_TIMESTAMP
               WHERE account_id = ? AND symbol = ?`,
              [newQuantity, newAveragePrice, accountId, symbol],
              function(err) {
                if (err) return reject(err);
                resolve({ id: existing.id, quantity: newQuantity, average_price: newAveragePrice });
              }
            );
          } else {
            // Create new position
            db.run(
              `INSERT INTO positions (user_id, account_id, symbol, quantity, average_price)
               VALUES (?, ?, ?, ?, ?)`,
              [userId, accountId, symbol, quantity, averagePrice],
              function(err) {
                if (err) return reject(err);
                resolve({ id: this.lastID, quantity, average_price: averagePrice });
              }
            );
          }
        }
      );
    });
  }

  /**
   * Get position by symbol
   */
  static async getBySymbol(accountId, symbol) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM positions WHERE account_id = ? AND symbol = ?',
        [accountId, symbol],
        (err, position) => {
          if (err) return reject(err);
          resolve(position);
        }
      );
    });
  }

  /**
   * Get all positions for an account
   */
  static async getByAccount(accountId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM positions WHERE account_id = ? ORDER BY symbol',
        [accountId],
        (err, positions) => {
          if (err) return reject(err);
          resolve(positions || []);
        }
      );
    });
  }

  /**
   * Update position with current market price
   */
  static async updateMarketValue(accountId, symbol, currentPrice) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE positions
         SET current_price = ?,
             market_value = quantity * ?,
             unrealized_pl = (? - average_price) * quantity,
             unrealized_pl_percent = ((? - average_price) / average_price) * 100,
             updated_at = CURRENT_TIMESTAMP
         WHERE account_id = ? AND symbol = ?`,
        [currentPrice, currentPrice, currentPrice, currentPrice, accountId, symbol],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  /**
   * Update all positions with current market prices
   */
  static async updateAllMarketValues(accountId, priceMap) {
    const positions = await this.getByAccount(accountId);

    const updates = positions.map(position => {
      const currentPrice = priceMap[position.symbol];
      if (currentPrice) {
        return this.updateMarketValue(accountId, position.symbol, currentPrice);
      }
      return Promise.resolve();
    });

    return Promise.all(updates);
  }

  /**
   * Close a position (delete)
   */
  static async close(accountId, symbol) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM positions WHERE account_id = ? AND symbol = ?',
        [accountId, symbol],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  /**
   * Get total positions value
   */
  static async getTotalValue(accountId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COALESCE(SUM(market_value), 0) as total FROM positions WHERE account_id = ?',
        [accountId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.total || 0);
        }
      );
    });
  }

  /**
   * Get positions statistics
   */
  static async getStats(accountId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT
          COUNT(*) as total_positions,
          COALESCE(SUM(market_value), 0) as total_market_value,
          COALESCE(SUM(unrealized_pl), 0) as total_unrealized_pl,
          COALESCE(AVG(unrealized_pl_percent), 0) as avg_unrealized_pl_percent
         FROM positions
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
   * Clear all positions (for account reset)
   */
  static async clearAll(accountId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM positions WHERE account_id = ?',
        [accountId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }
}

export default Position;
