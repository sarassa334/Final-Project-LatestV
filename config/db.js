import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;// pool ===> improves performance

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,// Full DB URL from .env
  ssl:// 	Security layer:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});
// we can do this With async/await:
pool.connect().then(() => {
  console.log("Database connected!");
});

export const query = (text, params) => pool.query(text, params);

export default pool; // default ===> Allows importing without using {} and lets you choose any name.


// pg (node-postgres)
// Official PostgreSQL client for Node.js
// Provides:
// Connection pooling
// Query execution
// PostgreSQL protocol implementation
//
// dotenv
// Loads environment variables from .env file into process.env
// Why? Keep database credentials out of code
//
// Real-World Analogy
// pg = A skilled postgres-speaking interpreter
// dotenv = A secure notepad holding secret passwords

//==============================
// pool.connect()
// In short:
// ✔ It's async (Promise)
// ✔ Gives you a client to run queries
// ✔ You must release it after use