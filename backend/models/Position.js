import pool from '../config/database.js';

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

    try {
      let res = await pool.query(
        'SELECT * FROM positions WHERE account_id = $1 AND symbol = $2',
        [accountId, symbol]
      );
      let existing = res.rows[0];

      if (existing) {
        // Update existing position
        const newQuantity = parseInt(existing.quantity) + parseInt(quantity);

        if (newQuantity === 0) {
          // Close position if quantity is zero
          return this.close(accountId, symbol);
        }

        // Calculate new average price
        const totalCost = (parseInt(existing.quantity) * parseFloat(existing.average_price)) + (parseInt(quantity) * parseFloat(averagePrice));
        const newAveragePrice = totalCost / newQuantity;

        await pool.query(
          `UPDATE positions
           SET quantity = $1,
               average_price = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE account_id = $3 AND symbol = $4`,
          [newQuantity, newAveragePrice, accountId, symbol]
        );
        return { id: existing.id, quantity: newQuantity, average_price: newAveragePrice };
      } else {
        // Create new position
        res = await pool.query(
          `INSERT INTO positions (user_id, account_id, symbol, quantity, average_price)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [userId, accountId, symbol, parseInt(quantity), parseFloat(averagePrice)]
        );
        return { id: res.rows[0].id, quantity: parseInt(quantity), average_price: parseFloat(averagePrice) };
      }
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get position by symbol
   */
  static async getBySymbol(accountId, symbol) {
    try {
      const res = await pool.query(
        'SELECT * FROM positions WHERE account_id = $1 AND symbol = $2',
        [accountId, symbol]
      );
      const position = res.rows[0] || null;
      if (position) {
        // Parse numeric fields
        position.quantity = parseInt(position.quantity);
        position.average_price = parseFloat(position.average_price);
        position.current_price = parseFloat(position.current_price || 0);
        position.market_value = parseFloat(position.market_value || 0);
        position.unrealized_pl = parseFloat(position.unrealized_pl || 0);
        position.unrealized_pl_percent = parseFloat(position.unrealized_pl_percent || 0);
      }
      return position;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all positions for an account
   */
  static async getByAccount(accountId) {
    try {
      const res = await pool.query(
        'SELECT * FROM positions WHERE account_id = $1 ORDER BY symbol',
        [accountId]
      );
      res.rows.forEach(position => {
        // Parse numeric fields
        position.quantity = parseInt(position.quantity);
        position.average_price = parseFloat(position.average_price);
        position.current_price = parseFloat(position.current_price || 0);
        position.market_value = parseFloat(position.market_value || 0);
        position.unrealized_pl = parseFloat(position.unrealized_pl || 0);
        position.unrealized_pl_percent = parseFloat(position.unrealized_pl_percent || 0);
      });
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Update position with current market price
   */
  static async updateMarketValue(accountId, symbol, currentPrice) {
    try {
      await pool.query(
        `UPDATE positions
         SET current_price = $1,
             market_value = CAST(quantity AS NUMERIC) * $1,
             unrealized_pl = ($1 - average_price) * CAST(quantity AS NUMERIC),
             unrealized_pl_percent = (($1 - average_price) / average_price * 100)::NUMERIC(5,2),
             updated_at = CURRENT_TIMESTAMP
         WHERE account_id = $2 AND symbol = $3`,
        [parseFloat(currentPrice), accountId, symbol]
      );
    } catch (err) {
      throw err;
    }
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
    try {
      await pool.query(
        'DELETE FROM positions WHERE account_id = $1 AND symbol = $2',
        [accountId, symbol]
      );
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get total positions value
   */
  static async getTotalValue(accountId) {
    try {
      const res = await pool.query(
        'SELECT COALESCE(SUM(market_value), 0) as total FROM positions WHERE account_id = $1',
        [accountId]
      );
      return parseFloat(res.rows[0].total);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get positions statistics
   */
  static async getStats(accountId) {
    try {
      const res = await pool.query(
        `SELECT
          COUNT(*)::INTEGER as total_positions,
          COALESCE(SUM(market_value), 0)::NUMERIC as total_market_value,
          COALESCE(SUM(unrealized_pl), 0)::NUMERIC as total_unrealized_pl,
          COALESCE(AVG(unrealized_pl_percent), 0)::NUMERIC(5,2) as avg_unrealized_pl_percent
         FROM positions
         WHERE account_id = $1`,
        [accountId]
      );
      const stats = res.rows[0];
      // Parse in JS for safety
      stats.total_positions = parseInt(stats.total_positions);
      stats.total_market_value = parseFloat(stats.total_market_value);
      stats.total_unrealized_pl = parseFloat(stats.total_unrealized_pl);
      stats.avg_unrealized_pl_percent = parseFloat(stats.avg_unrealized_pl_percent);
      return stats;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Clear all positions (for account reset)
   */
  static async clearAll(accountId) {
    try {
      await pool.query(
        'DELETE FROM positions WHERE account_id = $1',
        [accountId]
      );
    } catch (err) {
      throw err;
    }
  }
}

export default Position;
