import db from '../config/database.js';

class TradingAlgorithm {
  // Create a new trading algorithm
  static async create(userId, name, description = '') {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO trading_algorithms (user_id, name, description) VALUES (?, ?, ?)',
        [userId, name, description],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              user_id: userId,
              name,
              description,
              is_active: 0
            });
          }
        }
      );
    });
  }

  // Get all algorithms for a user
  static async findByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM trading_algorithms WHERE user_id = ? ORDER BY created_at DESC',
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

  // Get algorithm by ID
  static async findById(id, userId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM trading_algorithms WHERE id = ? AND user_id = ?',
        [id, userId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // Update algorithm
  static async update(id, userId, updates) {
    const { name, description, is_active } = updates;
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(is_active);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, userId);

    const query = `UPDATE trading_algorithms SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;

    return new Promise((resolve, reject) => {
      db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Delete algorithm
  static async delete(id, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM trading_algorithms WHERE id = ? AND user_id = ?',
        [id, userId],
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

  // Toggle algorithm active status
  static async toggleActive(id, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE trading_algorithms SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [id, userId],
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
}

export default TradingAlgorithm;
