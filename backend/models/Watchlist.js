import db from '../config/database.js';

class Watchlist {
  // Add stock to watchlist
  static async addStock(userId, symbol, companyName = '') {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO watchlist (user_id, symbol, company_name) VALUES (?, ?, ?)',
        [userId, symbol.toUpperCase(), companyName],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              user_id: userId,
              symbol: symbol.toUpperCase(),
              company_name: companyName
            });
          }
        }
      );
    });
  }

  // Remove stock from watchlist
  static async removeStock(userId, symbol) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM watchlist WHERE user_id = ? AND symbol = ?',
        [userId, symbol.toUpperCase()],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  }

  // Get all stocks in user's watchlist
  static async getUserWatchlist(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM watchlist WHERE user_id = ? ORDER BY added_at DESC',
        [userId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Check if stock is in watchlist
  static async isInWatchlist(userId, symbol) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM watchlist WHERE user_id = ? AND symbol = ?',
        [userId, symbol.toUpperCase()],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(!!row);
          }
        }
      );
    });
  }
}

export default Watchlist;
