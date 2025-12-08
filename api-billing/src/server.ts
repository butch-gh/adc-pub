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
import billingRoutes from './routes/billing';
import userRoutes from './routes/users';
import patientRoutes from './routes/patients';
import treatmentplansRoutes from './routes/treatmentplans';
import dentistRoutes from './routes/dentist';

const app = express();
const PORT = process.env.BILLING_PORT || 3001;

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

// Request timeout middleware
app.use((req, res, next) => {
  // Set a 30-second timeout for all requests
  req.setTimeout(30000, () => {
    console.log(`[BILLING-SERVICE] Request timeout for ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        success: false, 
        message: 'Request timeout' 
      });
    }
  });
  
  res.setTimeout(30000, () => {
    console.log(`[BILLING-SERVICE] Response timeout for ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        success: false, 
        message: 'Response timeout' 
      });
    }
  });
  
  next();
});

// Add request logging middleware (simplified)
app.use((req, res, next) => {
  // logger.debug(`[BILLING-SERVICE] ${req.method} ${req.url}`);
  // logger.debug(`[BILLING-SERVICE] Original URL: ${req.originalUrl}`);
  // logger.debug(`[BILLING-SERVICE] Path: ${req.path}`);
  // logger.debug(`[BILLING-SERVICE] Query: ${JSON.stringify(req.query)}`);
  next();
});

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/', billingRoutes);
app.use('/users', userRoutes);
app.use('/patients', patientRoutes);
app.use('/treatmentplans', treatmentplansRoutes);
app.use('/dentist', dentistRoutes);

// Test route to verify mounting
app.get('/test', (req, res) => {
  res.json({ message: 'Billing service API test route works!' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'billing',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found in billing service' });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`Billing Microservice running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start billing service:', error);
    process.exit(1);
  }
};

startServer();

export default app;


// Each log level has its own color:
// 🔴 ERROR: Red
// 🟢 SUCCESS: Green
// 🟡 WARNING: Yellow
// 🔵 INFO: Cyan
// 🟣 DEBUG: Magenta