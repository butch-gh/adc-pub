import { Pool } from 'pg';
import { logger } from '../utils/logger';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'adcdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'P@ssw0rd',
  max: 10, // Smaller pool for gateway
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const connectDB = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    logger.info('Gateway connected to PostgreSQL database');
    client.release();
  } catch (error) {
    logger.error('Gateway database connection failed:', error);
    throw error;
  }
};

export { pool };
