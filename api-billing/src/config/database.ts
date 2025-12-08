import { Pool } from 'pg';
import { logger } from '../utils/logger';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'adc-phase2',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'P@ssw0rd',
  max: 15, // Dedicated pool for billing service
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const connectDB = async (): Promise<void> => {
  try {
    console.log(`Attempting to connect to database:`);
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Port: ${process.env.DB_PORT}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`User: ${process.env.DB_USER}`);
    
    const client = await pool.connect();
    logger.info('Billing service connected to PostgreSQL database');
    client.release();
  } catch (error) {
    console.error('Detailed database connection error:', error);
    logger.error('Billing service database connection failed:', error);
    throw error;
  }
};

export { pool };
