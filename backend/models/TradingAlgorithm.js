import pool from '../config/database.js';

class TradingAlgorithm {
  // Create a new trading algorithm
  static async create(userId, name, description = '') {
    try {
      const res = await pool.query(
        'INSERT INTO trading_algorithms (user_id, name, description) VALUES ($1, $2, $3) RETURNING id',
        [userId, name, description]
      );
      return {
        id: res.rows[0].id,
        user_id: userId,
        name,
        description,
        is_active: false
      };
    } catch (err) {
      throw err;
    }
  }

  // Get all algorithms for a user
  static async findByUserId(userId) {
    try {
      const res = await pool.query(
        'SELECT * FROM trading_algorithms WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  // Get algorithm by ID
  static async findById(id, userId) {
    try {
      const res = await pool.query(
        'SELECT * FROM trading_algorithms WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return res.rows[0] || null;
    } catch (err) {
      throw err;
    }
  }

  // Update algorithm
  static async update(id, userId, updates) {
    const { name, description, is_active } = updates;
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, userId);
    fields.push('id = $${paramIndex++}');
    fields.push('user_id = $${paramIndex++}');

    const setClause = fields.slice(0, -2).join(', ');
    const query = `UPDATE trading_algorithms SET ${setClause} WHERE id = $${paramIndex-1} AND user_id = $${paramIndex}`;

    try {
      const res = await pool.query(query, values);
      return { changes: res.rowCount };
    } catch (err) {
      throw err;
    }
  }

  // Delete algorithm
  static async delete(id, userId) {
    try {
      const res = await pool.query(
        'DELETE FROM trading_algorithms WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return { changes: res.rowCount };
    } catch (err) {
      throw err;
    }
  }

  // Toggle algorithm active status
  static async toggleActive(id, userId) {
    try {
      const res = await pool.query(
        'UPDATE trading_algorithms SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return { changes: res.rowCount };
    } catch (err) {
      throw err;
    }
  }
}

export default TradingAlgorithm;
