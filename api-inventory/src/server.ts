import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { connectDB } from './config/database';
import { extractUser } from './middleware/extractUser';

// Import routes
import inventoryRoutes from './routes/inventory';
import supplierRoutes from './routes/suppliers';
import patientRoutes from './routes/patients';

const app = express();
const PORT = process.env.INVENTORY_PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: true, // Accept requests from gateway
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Extract user info from headers (set by gateway)
app.use(extractUser);


// Add request logging middleware (simplified)
app.use((req, res, next) => {
  console.log(`[INVENTORY-SERVICE] ${req.method} ${req.url}`);
  console.log(`[INVENTORY-SERVICE] Original URL: ${req.originalUrl}`);
  console.log(`[INVENTORY-SERVICE] Path: ${req.path}`);
  console.log(`[INVENTORY-SERVICE] Query: ${JSON.stringify(req.query)}`);
  next();
});

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/', inventoryRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/patients', patientRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'inventory',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found in inventory service' });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`Inventory Microservice running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start inventory service:', error);
    process.exit(1);
  }
};

startServer();

export default app;
