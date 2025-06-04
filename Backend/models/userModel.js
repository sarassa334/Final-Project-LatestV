import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

const UserModel = {
  // Unified user creation for both local and OAuth
  async create({ 
    email, 
    name, 
    password = null, 
    oauth_provider = null, 
    oauth_id = null, 
    avatar = null,
    role = 'student'
  }) {
    try {
      const password_hash = password 
        ? await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS))
        : null;

      const { rows } = await query(
        `INSERT INTO users (
          email, 
          name,
          password_hash, 
          oauth_provider, 
          oauth_id,
          role,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *`,
        [
          email,
          name,
          password_hash,
          oauth_provider,
          oauth_id,
          role, // Default role
          true // OAuth users are immediately active
        ]
      );
      return rows[0];
    } catch (error) {
      if (error.code === "23505") {
        throw new Error("Email already exists");
      }
      throw error;
    }
  },

  // Find user by email
  async findByEmail(email) {
    const { rows } = await query(
      `SELECT 
        id, 
        email, 
        name,
        password_hash, 
        role,
        oauth_provider, 
        oauth_id,
        is_active,
        created_at
      FROM users WHERE email = $1`,
      [email]
    );
    return rows[0];
  },

  // Find user by ID
  async findById(id) {
    const { rows } = await query(
      `SELECT 
        id, 
        email, 
        name, 
        role,
        oauth_provider, 
        oauth_id,
        is_active,
        created_at
      FROM users WHERE id = $1`,
      [id]
    );
    return rows[0];
  },

  // OAuth-specific lookup
  async findByOAuthId(oauth_id, oauth_provider) {
    const { rows } = await query(
      `SELECT 
        id,
        email,
        name,
        role,
        is_active
      FROM users WHERE oauth_id = $1 AND oauth_provider = $2`,
      [oauth_id, oauth_provider]
    );
    return rows[0];
  },

  // Account linking
  async linkOAuthAccount(userId, { provider, providerId, email }) {
    const { rows } = await query(
      `UPDATE users 
       SET oauth_provider = $1, 
           oauth_id = $2,
           email = COALESCE($3, email),
           is_active = true
       WHERE id = $4
       RETURNING id, email, name, role, oauth_provider`,
      [provider, providerId, email, userId]
    );
    return rows[0];
  },

  // Token generation
  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role 
      }, 
      process.env.JWT_SECRET, 
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      }
    );
  },

  // Password verification
  async verifyPassword(candidatePassword, password_hash) {
    if (!password_hash) return false; // For OAuth users without password
    return await bcrypt.compare(candidatePassword, password_hash);
  },

  // Password update
  async updatePassword(userId, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    
    const password_hash = await bcrypt.hash(
      newPassword,
      parseInt(process.env.BCRYPT_SALT_ROUNDS)
    );
    
    await query(
      "UPDATE users SET password_hash = $1, is_active = true WHERE id = $2", 
      [password_hash, userId]
    );
  },

  // User activation/deactivation
  async setActiveStatus(userId, isActive) {
    await query(
      "UPDATE users SET is_active = $1 WHERE id = $2",
      [isActive, userId]
    );
  },

  // Profile update
  async updateProfile(userId, { name, email }) {
    const { rows } = await query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           email = COALESCE($2, email)
       WHERE id = $3
       RETURNING id, name, email, role`,
      [name, email, userId]
    );
    return rows[0];
  }
};

export default UserModel;