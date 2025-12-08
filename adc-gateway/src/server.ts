import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createHandler } from 'graphql-http/lib/use/express';
import { GraphQLSchema } from 'graphql';

// Load environment variables
dotenv.config();

import { logger } from './utils/logger';
import { connectDB } from './config/database';
import { verifyToken, TokenPayload } from './utils/token';
import { buildSchema, setupSchemaRefresh } from './graphql/schemaStitching';

// Import auth routes
import authRoutes from './routes/auth';

const app = express();
const PORT = process.env.GATEWAY_PORT || 5008;

// Rate limiting
const isDevelopment = process.env.NODE_ENV !== 'production';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (!isDevelopment) return false;
    return (
      req.ip === '127.0.0.1' ||
      req.ip === '::1' ||
      (req.ip?.startsWith('192.168.') ?? false) ||
      (req.ip?.startsWith('10.') ?? false)
    );
  }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 100 : 20,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (!isDevelopment) return false;
    return (
      req.ip === '127.0.0.1' ||
      req.ip === '::1' ||
      (req.ip?.startsWith('192.168.') ?? false)
    );
  }
});

// Request logging
app.use((req, res, next) => {
  logger.debug(`[GRAPHQL-GATEWAY] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://adc-portal.adrianodentalclinic.online',
        'https://adc-billing.adrianodentalclinic.online',
        'https://adc-inventory.adrianodentalclinic.online',
        'https://adc-prescription.adrianodentalclinic.online',
        'https://adc-admin.adrianodentalclinic.online',
        'https://adc-maintenance.adrianodentalclinic.online'
      ]
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:5177',
        'http://localhost:5178'
      ],
  credentials: true
}));

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Authentication routes (no JWT required)
app.use('/api/auth', strictLimiter, authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    gateway: 'graphql-gateway',
    version: '1.0.0'
  });
});

// Global schema variable
let globalSchema: GraphQLSchema | null = null;

// Authentication middleware for GraphQL
const authenticateGraphQL = (req: express.Request): TokenPayload | null => {
  const authHeader = req.headers.authorization;
  
  // Allow introspection queries without auth in development
  if (isDevelopment && req.body?.query?.includes('__schema')) {
    logger.debug('Allowing introspection query without auth');
    return null;
  }

  const token = authHeader?.split(' ')[1];

  if (!token) {
    logger.warn('No token provided for GraphQL request');
    return null;
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    logger.warn('Invalid token provided for GraphQL request');
    return null;
  }

  return decoded;
};

// GraphQL endpoint setup
const setupGraphQL = async () => {
  try {
    // Build the stitched schema
    logger.info('Building GraphQL schema from microservices...');
    const schema = await buildSchema();

    if (!schema) {
      logger.error('Failed to build GraphQL schema');
      return;
    }

    globalSchema = schema;
    logger.success('GraphQL schema built successfully');

    // Create GraphQL handler
    const graphqlHandler = createHandler({
      schema,
      context: (req) => {
        // Extract user from JWT token
        const user = authenticateGraphQL(req.raw as express.Request);
        return { user };
      }
    });

    // GraphQL endpoint
    app.all('/graphql', (req, res, next) => {
      // Optional: Require authentication for all GraphQL operations (except introspection)
      if (!isDevelopment || !req.body?.query?.includes('__schema')) {
        const user = authenticateGraphQL(req);
        if (!user) {
          // In production, you might want to return 401 here
          // For now, we'll allow unauthenticated requests but with null user context
          logger.debug('Processing GraphQL request without authentication');
        }
      }

      graphqlHandler(req, res, next);
    });

    logger.success('GraphQL endpoint configured at /graphql');

    // Optional: Set up schema refresh every 5 minutes
    setupSchemaRefresh((newSchema) => {
      globalSchema = newSchema;
      logger.info('Schema updated');
    }, 300000);

  } catch (error) {
    logger.error('Error setting up GraphQL:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    // Connect to database (for authentication)
    await connectDB();

    // Set up GraphQL schema stitching
    await setupGraphQL();

    // 404 handler - must be after all routes are set up
    app.use('*', (req, res) => {
      res.status(404).json({ message: 'Route not found in GraphQL gateway' });
    });

    app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`GraphQL Gateway running on port ${PORT}`);
      logger.info(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
      logger.info(`Authentication endpoints: http://localhost:${PORT}/api/auth/*`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start GraphQL Gateway:', error);
    process.exit(1);
  }
};

startServer();

export default app;
