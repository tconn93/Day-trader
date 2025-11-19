import db from '../config/database.js';

/**
 * Order Model
 * Manages buy and sell orders for paper trading
 */

class Order {
  /**
   * Create a new order
   */
  static async create(orderData) {
    const { userId, accountId, algorithmId, symbol, type, side, quantity, price } = orderData;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO orders (user_id, account_id, algorithm_id, symbol, type, side, quantity, price, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [userId, accountId, algorithmId || null, symbol, type, side, quantity, price],
        function(err) {
          if (err) return reject(err);

          resolve({
            id: this.lastID,
            ...orderData,
            status: 'pending',
            created_at: new Date().toISOString()
          });
        }
      );
    });
  }

  /**
   * Get order by ID
   */
  static async getById(orderId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM orders WHERE id = ?',
        [orderId],
        (err, order) => {
          if (err) return reject(err);
          resolve(order);
        }
      );
    });
  }

  /**
   * Get all orders for an account
   */
  static async getByAccount(accountId, limit = 100) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM orders
         WHERE account_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [accountId, limit],
        (err, orders) => {
          if (err) return reject(err);
          resolve(orders || []);
        }
      );
    });
  }

  /**
   * Get orders by algorithm
   */
  static async getByAlgorithm(algorithmId, limit = 100) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM orders
         WHERE algorithm_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [algorithmId, limit],
        (err, orders) => {
          if (err) return reject(err);
          resolve(orders || []);
        }
      );
    });
  }

  /**
   * Get pending orders
   */
  static async getPending(accountId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM orders
         WHERE account_id = ? AND status = 'pending'
         ORDER BY created_at ASC`,
        [accountId],
        (err, orders) => {
          if (err) return reject(err);
          resolve(orders || []);
        }
      );
    });
  }

  /**
   * Update order status
   */
  static async updateStatus(orderId, status) {
    return new Promise((resolve, reject) => {
      const filledAt = status === 'filled' ? new Date().toISOString() : null;

      db.run(
        `UPDATE orders
         SET status = ?, filled_at = ?
         WHERE id = ?`,
        [status, filledAt, orderId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  /**
   * Fill an order (mark as executed)
   */
  static async fill(orderId) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE orders
         SET status = 'filled', filled_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [orderId],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  /**
   * Cancel an order
   */
  static async cancel(orderId) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE orders
         SET status = 'cancelled'
         WHERE id = ? AND status = 'pending'`,
        [orderId],
        function(err) {
          if (err) return reject(err);

          if (this.changes === 0) {
            return reject(new Error('Order cannot be cancelled'));
          }

          resolve();
        }
      );
    });
  }

  /**
   * Get order history for a symbol
   */
  static async getBySymbol(accountId, symbol, limit = 50) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM orders
         WHERE account_id = ? AND symbol = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [accountId, symbol, limit],
        (err, orders) => {
          if (err) return reject(err);
          resolve(orders || []);
        }
      );
    });
  }

  /**
   * Get order statistics
   */
  static async getStats(accountId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'filled' THEN 1 ELSE 0 END) as filled_orders,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
          SUM(CASE WHEN side = 'buy' AND status = 'filled' THEN 1 ELSE 0 END) as total_buys,
          SUM(CASE WHEN side = 'sell' AND status = 'filled' THEN 1 ELSE 0 END) as total_sells
         FROM orders
         WHERE account_id = ?`,
        [accountId],
        (err, stats) => {
          if (err) return reject(err);
          resolve(stats);
        }
      );
    });
  }
}

export default Order;
