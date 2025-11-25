import pool from '../config/database.js';

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

    try {
      const res = await pool.query(
        `INSERT INTO orders (user_id, account_id, algorithm_id, symbol, type, side, quantity, price, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
        [userId, accountId, algorithmId || null, symbol, type, side, quantity, price]
      );
      return {
        ...res.rows[0],
        created_at: res.rows[0].created_at.toISOString()
      };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get order by ID
   */
  static async getById(orderId) {
    try {
      const res = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [orderId]
      );
      return res.rows[0] || null;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all orders for an account
   */
  static async getByAccount(accountId, limit = 100) {
    try {
      const res = await pool.query(
        `SELECT * FROM orders
         WHERE account_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [accountId, limit]
      );
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get orders by algorithm
   */
  static async getByAlgorithm(algorithmId, limit = 100) {
    try {
      const res = await pool.query(
        `SELECT * FROM orders
         WHERE algorithm_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [algorithmId, limit]
      );
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get pending orders
   */
  static async getPending(accountId) {
    try {
      const res = await pool.query(
        `SELECT * FROM orders
         WHERE account_id = $1 AND status = 'pending'
         ORDER BY created_at ASC`,
        [accountId]
      );
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Update order status
   */
  static async updateStatus(orderId, status) {
    try {
      const filledAt = status === 'filled' ? new Date().toISOString() : null;
      await pool.query(
        `UPDATE orders
         SET status = $1, filled_at = $2
         WHERE id = $3`,
        [status, filledAt, orderId]
      );
    } catch (err) {
      throw err;
    }
  }

  /**
   * Fill an order (mark as executed)
   */
  static async fill(orderId) {
    try {
      await pool.query(
        `UPDATE orders
         SET status = 'filled', filled_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [orderId]
      );
    } catch (err) {
      throw err;
    }
  }

  /**
   * Cancel an order
   */
  static async cancel(orderId) {
    try {
      const res = await pool.query(
        `UPDATE orders
         SET status = 'cancelled'
         WHERE id = $1 AND status = 'pending'`,
        [orderId]
      );
      if (res.rowCount === 0) {
        throw new Error('Order cannot be cancelled');
      }
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get order history for a symbol
   */
  static async getBySymbol(accountId, symbol, limit = 50) {
    try {
      const res = await pool.query(
        `SELECT * FROM orders
         WHERE account_id = $1 AND symbol = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [accountId, symbol, limit]
      );
      return res.rows;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get order statistics
   */
  static async getStats(accountId) {
    try {
      const res = await pool.query(
        `SELECT
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'filled' THEN 1 ELSE 0 END) as filled_orders,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
          SUM(CASE WHEN side = 'buy' AND status = 'filled' THEN 1 ELSE 0 END) as total_buys,
          SUM(CASE WHEN side = 'sell' AND status = 'filled' THEN 1 ELSE 0 END) as total_sells
         FROM orders
         WHERE account_id = $1`,
        [accountId]
      );
      return res.rows[0];
    } catch (err) {
      throw err;
    }
  }
}

export default Order;
