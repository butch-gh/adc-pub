import { Pool } from 'pg';
import { logger } from '../utils/logger';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'adriano_dental',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    logger.info('GraphQL Gateway: Database connected successfully');
    client.release();
  } catch (error) {
    logger.error('GraphQL Gateway: Database connection failed:', error);
    throw error;
  }
};
