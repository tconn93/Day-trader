import db from '../config/database.js';

class AlgorithmRule {
  // Create a new rule for an algorithm
  static async create(algorithmId, ruleData) {
    const { rule_type, condition_field, condition_operator, condition_value, action, order_index = 0 } = ruleData;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO algorithm_rules
        (algorithm_id, rule_type, condition_field, condition_operator, condition_value, action, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [algorithmId, rule_type, condition_field, condition_operator, condition_value, action, order_index],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              algorithm_id: algorithmId,
              ...ruleData
            });
          }
        }
      );
    });
  }

  // Get all rules for an algorithm
  static async findByAlgorithmId(algorithmId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM algorithm_rules WHERE algorithm_id = ? ORDER BY order_index ASC',
        [algorithmId],
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

  // Get rule by ID
  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM algorithm_rules WHERE id = ?',
        [id],
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

  // Update rule
  static async update(id, updates) {
    const { rule_type, condition_field, condition_operator, condition_value, action, order_index } = updates;
    const fields = [];
    const values = [];

    if (rule_type !== undefined) {
      fields.push('rule_type = ?');
      values.push(rule_type);
    }
    if (condition_field !== undefined) {
      fields.push('condition_field = ?');
      values.push(condition_field);
    }
    if (condition_operator !== undefined) {
      fields.push('condition_operator = ?');
      values.push(condition_operator);
    }
    if (condition_value !== undefined) {
      fields.push('condition_value = ?');
      values.push(condition_value);
    }
    if (action !== undefined) {
      fields.push('action = ?');
      values.push(action);
    }
    if (order_index !== undefined) {
      fields.push('order_index = ?');
      values.push(order_index);
    }

    if (fields.length === 0) {
      return Promise.resolve({ changes: 0 });
    }

    values.push(id);
    const query = `UPDATE algorithm_rules SET ${fields.join(', ')} WHERE id = ?`;

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

  // Delete rule
  static async delete(id) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM algorithm_rules WHERE id = ?',
        [id],
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

  // Delete all rules for an algorithm
  static async deleteByAlgorithmId(algorithmId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM algorithm_rules WHERE algorithm_id = ?',
        [algorithmId],
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

export default AlgorithmRule;
