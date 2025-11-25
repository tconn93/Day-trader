import pool from '../config/database.js';

class AlgorithmRule {
  // Create a new rule for an algorithm
  static async create(algorithmId, ruleData) {
    const { rule_type, condition_field, condition_operator, condition_value, action, order_index = 0 } = ruleData;

    try {
      const res = await pool.query(
        `INSERT INTO algorithm_rules
        (algorithm_id, rule_type, condition_field, condition_operator, condition_value, action, order_index)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [algorithmId, rule_type, condition_field, condition_operator, condition_value, action, order_index]
      );
      return {
        id: res.rows[0].id,
        algorithm_id: algorithmId,
        ...ruleData
      };
    } catch (err) {
      throw err;
    }
  }

  // Get all rules for an algorithm
  static async findByAlgorithmId(algorithmId) {
    try {
      const res = await pool.query(
        'SELECT * FROM algorithm_rules WHERE algorithm_id = $1 ORDER BY order_index ASC',
        [algorithmId]
      );
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  // Get rule by ID
  static async findById(id) {
    try {
      const res = await pool.query(
        'SELECT * FROM algorithm_rules WHERE id = $1',
        [id]
      );
      return res.rows[0] || null;
    } catch (err) {
      throw err;
    }
  }

  // Update rule
  static async update(id, updates) {
    const { rule_type, condition_field, condition_operator, condition_value, action, order_index } = updates;
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (rule_type !== undefined) {
      fields.push(`rule_type = $${paramIndex++}`);
      values.push(rule_type);
    }
    if (condition_field !== undefined) {
      fields.push(`condition_field = $${paramIndex++}`);
      values.push(condition_field);
    }
    if (condition_operator !== undefined) {
      fields.push(`condition_operator = $${paramIndex++}`);
      values.push(condition_operator);
    }
    if (condition_value !== undefined) {
      fields.push(`condition_value = $${paramIndex++}`);
      values.push(condition_value);
    }
    if (action !== undefined) {
      fields.push(`action = $${paramIndex++}`);
      values.push(action);
    }
    if (order_index !== undefined) {
      fields.push(`order_index = $${paramIndex++}`);
      values.push(order_index);
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    values.push(id);
    fields.push(`id = $${paramIndex++}`);
    const setClause = fields.slice(0, -1).join(', ');
    const query = `UPDATE algorithm_rules SET ${setClause} WHERE id = $${paramIndex-1}`;

    try {
      const res = await pool.query(query, values);
      return { changes: res.rowCount };
    } catch (err) {
      throw err;
    }
  }

  // Delete rule
  static async delete(id) {
    try {
      const res = await pool.query(
        'DELETE FROM algorithm_rules WHERE id = $1',
        [id]
      );
      return { changes: res.rowCount };
    } catch (err) {
      throw err;
    }
  }

  // Delete all rules for an algorithm
  static async deleteByAlgorithmId(algorithmId) {
    try {
      const res = await pool.query(
        'DELETE FROM algorithm_rules WHERE algorithm_id = $1',
        [algorithmId]
      );
      return { changes: res.rowCount };
    } catch (err) {
      throw err;
    }
  }
}

export default AlgorithmRule;
