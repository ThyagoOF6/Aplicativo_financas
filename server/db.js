import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Support both unified connectionString or individual credentials
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'wealth_manager'}`;

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

export default pool;
