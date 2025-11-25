import pool from '../config/database.js';

class Watchlist {
  // Add stock to watchlist
  static async addStock(userId, symbol, companyName = '') {
    try {
      const res = await pool.query(
        'INSERT INTO watchlist (user_id, symbol, company_name) VALUES ($1, $2, $3) RETURNING id',
        [userId, symbol.toUpperCase(), companyName]
      );
      return {
        id: res.rows[0].id,
        user_id: userId,
        symbol: symbol.toUpperCase(),
        company_name: companyName
      };
    } catch (err) {
      throw err;
    }
  }

  // Remove stock from watchlist
  static async removeStock(userId, symbol) {
    try {
      const res = await pool.query(
        'DELETE FROM watchlist WHERE user_id = $1 AND symbol = $2 RETURNING *',
        [userId, symbol.toUpperCase()]
      );
      return { changes: res.rowCount };
    } catch (err) {
      throw err;
    }
  }

  // Get all stocks in user's watchlist
  static async getUserWatchlist(userId) {
    try {
      const res = await pool.query(
        'SELECT * FROM watchlist WHERE user_id = $1 ORDER BY added_at DESC',
        [userId]
      );
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  // Check if stock is in watchlist
  static async isInWatchlist(userId, symbol) {
    try {
      const res = await pool.query(
        'SELECT * FROM watchlist WHERE user_id = $1 AND symbol = $2',
        [userId, symbol.toUpperCase()]
      );
      return !!res.rows[0];
    } catch (err) {
      throw err;
    }
  }
}

export default Watchlist;
