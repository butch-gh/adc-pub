import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createHandler } from 'graphql-http/lib/use/express';
import { makeExecutableSchema } from '@graphql-tools/schema';

// Load environment variables
dotenv.config();

import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { connectDB } from './config/database';
import { extractUser } from './middleware/extractUser';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';

const app = express();
const PORT = process.env.MAINTENANCE_PORT || 5007;

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request timeout middleware
app.use((req, res, next) => {
  // Set a 30-second timeout for all requests
  req.setTimeout(30000, () => {
    console.log(`[MAINTENANCE-SERVICE] Request timeout for ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        success: false, 
        message: 'Request timeout' 
      });
    }
  });
  
  res.setTimeout(30000, () => {
    console.log(`[MAINTENANCE-SERVICE] Response timeout for ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        success: false, 
        message: 'Response timeout' 
      });
    }
  });
  
  next();
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Maintenance service API test route works!' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'maintenance',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    logger.info('Database connected');

    // Create GraphQL handler with context
    const graphqlHandler = createHandler({
      schema,
      context: (req) => {
        // Extract user from request (set by extractUser middleware)
        return { user: (req.raw as any).user };
      }
    });

    // GraphQL endpoint with authentication middleware
    app.all('/maintenance', extractUser, graphqlHandler);

    logger.info('GraphQL endpoint configured at /maintenance');

    // Error handling middleware
    app.use(errorHandler);

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ message: 'Route not found in maintenance service' });
    });

    app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`Maintenance Microservice running on port ${PORT}`);
      logger.info(`GraphQL endpoint: http://localhost:${PORT}/maintenance`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start maintenance service:', error);
    process.exit(1);
  }
};

startServer();

export default app;
