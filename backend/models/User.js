import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

class User {
  // Create a new user
  static async create(email, password, name) {
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const res = await pool.query(
        'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id',
        [email, hashedPassword, name]
      );
      return { id: res.rows[0].id, email, name };
    } catch (err) {
      throw err;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return res.rows[0] || null;
    } catch (err) {
      throw err;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const res = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    } catch (err) {
      throw err;
    }
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

export default User;
