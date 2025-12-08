import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import proxy from 'express-http-proxy';

// Load environment variables
dotenv.config();

import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { authenticate } from './middleware/authenticate';
import './types'; // Import type extensions

// Import auth routes (handled by gateway)
import authRoutes from './routes/auth';
import securityRoutes from './routes/security';
import webhooksRoutes from './routes/webhooks';
import paymentsRoutes from './routes/payments';

const app = express();
const PORT = process.env.GATEWAY_PORT || 5002;

// Microservice URLs - Use 127.0.0.1 instead of localhost to force IPv4
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:5003';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:5004';
const PRESCRIPTION_SERVICE_URL = process.env.PRESCRIPTION_SERVICE_URL || 'http://localhost:5005';
const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:5006';
const MAINTENANCE_SERVICE_URL = process.env.MAINTENANCE_SERVICE_URL || 'http://localhost:5007';

// Rate limiting - More lenient for development
const isDevelopment = process.env.NODE_ENV !== 'production';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 1000, // Higher limit for development (100)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for localhost in development
  skip: (req) => {
    if (!isDevelopment) return false;
    
    return (
      req.ip === '127.0.0.1' || 
      req.ip === '::1' || 
      (req.ip?.startsWith('192.168.') ?? false) ||
      (req.ip?.startsWith('10.') ?? false) ||
      (req.ip?.startsWith('172.') ?? false)
    );
  }
});

// Enhanced rate limiting for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 100 : 20, // More lenient for development
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip for local development
  skip: (req) => {
    if (!isDevelopment) return false;
    
    return (
      req.ip === '127.0.0.1' || 
      req.ip === '::1' || 
      (req.ip?.startsWith('192.168.') ?? false) ||
      (req.ip?.startsWith('10.') ?? false) ||
      (req.ip?.startsWith('172.') ?? false)
    );
  }
});

// Simple request logging middleware
app.use((req, res, next) => {
  console.log(`[GATEWAY-SERVICE] ${req.method} ${req.url}`);
  console.log(`[GATEWAY-SERVICE] Original URL: ${req.originalUrl}`);
  console.log(`[GATEWAY-SERVICE] Path: ${req.path}`);
  console.log(`[GATEWAY-SERVICE] Query: ${JSON.stringify(req.query)}`);
  next();
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://adc-portal.adrianodentalclinic.online','https://adc-billing.adrianodentalclinic.online','https://adc-inventory.adrianodentalclinic.online','https://adc-prescription.adrianodentalclinic.online','https://adc-admin.adrianodentalclinic.online']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178'],
  credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for uploads (centralized)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Authentication routes (handled by gateway)
app.use('/api/auth', strictLimiter, authRoutes);
app.use('/webhooks', strictLimiter, webhooksRoutes);
app.use('/gw/payments', strictLimiter, paymentsRoutes);
// app.use('/api/security', strictLimiter, securityRoutes);

// Proxy configuration factory
const createServiceProxy = (targetUrl: string, serviceName: string) => {
  console.log(`Creating proxy for service: ${serviceName} -> ${targetUrl}`);
  return proxy(targetUrl, {
    timeout: 30000,
    proxyReqPathResolver: (req: express.Request) => {
      // Log the original request
      console.log(`=== GATEWAY PROXY [${serviceName.toUpperCase()}] ===`);
      console.log('Original URL:', req.url);
      console.log('Original path:', req.path);
      console.log('Method:', req.method);
      console.log('Target:', targetUrl);

      // For express-http-proxy, req.url is the remaining path after route matching
      // We need to handle path rewriting based on service
      let newPath = req.url;
      
      // Default behavior for unknown services
        // if (!newPath.startsWith('/api')) {
        //   newPath = '/api' + newPath;
        // }
      console.log('Default path rewritten from:', req.url, 'to:', newPath);

      return newPath;
    },
    proxyReqOptDecorator: (proxyReqOpts: any, srcReq: express.Request) => {
      // Forward user information to microservices
      if (srcReq.user) {
        const userId = (srcReq.user as any).userId || (srcReq.user as any).id;
        if (userId) {
          proxyReqOpts.headers!['X-User-ID'] = String(userId);
        }

        if ((srcReq.user as any).role) {
          proxyReqOpts.headers!['X-User-Role'] = String((srcReq.user as any).role);
        }

        if ((srcReq.user as any).email) {
          proxyReqOpts.headers!['X-User-Email'] = String((srcReq.user as any).email);
        }

        if ((srcReq.user as any).username) {
          proxyReqOpts.headers!['X-User-Username'] = String((srcReq.user as any).username);
        }

        console.log('Proxy headers set:', {
          'X-User-ID': userId,
          'X-User-Role': (srcReq.user as any).role,
          'X-User-Email': (srcReq.user as any).email,
          'X-User-Username': (srcReq.user as any).username
        });
      }

      // Ensure proper content-type for JSON requests
      if (srcReq.method === 'POST' && srcReq.body) {
        proxyReqOpts.headers!['Content-Type'] = 'application/json';
      }

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes: any, proxyResData: any, userReq: express.Request, userRes: express.Response) => {
      console.log(`=== GATEWAY RESPONSE [${serviceName.toUpperCase()}] ===`);
      console.log('Response status:', proxyRes.statusCode);
      console.log('Response from:', userReq.url);
      console.log('==============================');

      logger.info(`[${serviceName}] Response from ${userReq.url}: ${proxyRes.statusCode}`);
      return proxyResData;
    },
    proxyErrorHandler: (err: any, res: express.Response, next: express.NextFunction) => {
      logger.error(`[${serviceName}] Proxy error:`, {
        message: err.message,
        code: err.code,
        errno: err.errno,
        syscall: err.syscall,
        address: err.address,
        port: err.port
      });
      
      // Only send response if headers haven't been sent
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Service temporarily unavailable',
          service: serviceName,
          message: 'The requested service is currently unavailable. Please try again later.'
        });
      }
    }
  });
};

// Special SSE proxy configuration for Server-Sent Events
const createSSEProxy = (targetUrl: string, serviceName: string) => {
  console.log(`Creating SSE proxy for service: ${serviceName} -> ${targetUrl}`);
  return proxy(targetUrl, {
    timeout: 0, // No timeout for SSE connections
    proxyReqPathResolver: (req: express.Request) => {
      console.log(`=== SSE GATEWAY PROXY [${serviceName.toUpperCase()}] ===`);
      console.log('SSE Original URL:', req.url);
      console.log('SSE Target:', targetUrl);
      return req.url;
    },
    proxyReqOptDecorator: (proxyReqOpts: any, srcReq: express.Request) => {
      // Set headers for SSE
      proxyReqOpts.headers!['Accept'] = 'text/event-stream';
      proxyReqOpts.headers!['Cache-Control'] = 'no-cache';
      proxyReqOpts.headers!['Connection'] = 'keep-alive';
      
      // Forward user information if available
      if (srcReq.user) {
        const userId = (srcReq.user as any).userId || (srcReq.user as any).id;
        if (userId) {
          proxyReqOpts.headers!['X-User-ID'] = String(userId);
        }
      }

      console.log('SSE Proxy headers set:', proxyReqOpts.headers);
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes: any, proxyResData: any, userReq: express.Request, userRes: express.Response) => {
      // Set SSE response headers
      userRes.setHeader('Content-Type', 'text/event-stream');
      userRes.setHeader('Cache-Control', 'no-cache');
      userRes.setHeader('Connection', 'keep-alive');
      userRes.setHeader('Access-Control-Allow-Origin', '*');
      userRes.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
      
      console.log(`=== SSE GATEWAY RESPONSE [${serviceName.toUpperCase()}] ===`);
      console.log('SSE Response status:', proxyRes.statusCode);
      console.log('SSE Response headers set on userRes');
      
      // Important: Return the data as-is for SSE
      return proxyResData;
    },
    proxyErrorHandler: (err: any, res: express.Response, next: express.NextFunction) => {
      logger.error(`[${serviceName}] SSE Proxy error:`, {
        message: err.message,
        code: err.code,
        errno: err.errno,
        syscall: err.syscall,
        address: err.address,
        port: err.port
      });
      
      // Only send response if headers haven't been sent
      if (!res.headersSent) {
        res.status(503).json({
          error: 'SSE Service temporarily unavailable',
          service: serviceName,
          message: 'The SSE connection is currently unavailable. Please try again later.'
        });
      }
    }
  });
};

// Enhanced error handling and monitoring
const serviceHealthCache = new Map<string, { status: string; lastChecked: number; failures: number }>();

// Circuit breaker configuration
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

// Check if service is in circuit breaker state
const isCircuitBreakerOpen = (serviceName: string): boolean => {
  const health = serviceHealthCache.get(serviceName);
  if (!health) return false;

  if (health.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    const timeSinceLastFailure = Date.now() - health.lastChecked;
    if (timeSinceLastFailure < CIRCUIT_BREAKER_TIMEOUT) {
      return true; // Circuit breaker is open
    } else {
      // Reset circuit breaker after timeout
      health.failures = 0;
      return false;
    }
  }
  return false;
};

// Update service health status
const updateServiceHealth = (serviceName: string, success: boolean) => {
  const health = serviceHealthCache.get(serviceName) || { status: 'unknown', lastChecked: 0, failures: 0 };

  health.lastChecked = Date.now();
  if (success) {
    health.status = 'healthy';
    health.failures = Math.max(0, health.failures - 1); // Gradually reduce failure count
  } else {
    health.status = 'unhealthy';
    health.failures += 1;
  }

  serviceHealthCache.set(serviceName, health);
};


// Public Service route without authentication
app.use('/appointment-public', createServiceProxy(APPOINTMENT_SERVICE_URL, 'appointment-public'));

// SSE routes - Special handling for Server-Sent Events (before regular routes)
// SSE endpoints for notification streams
app.get('/appointment-public-sse', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('=== SSE ROUTE DETECTED ===');
  console.log('SSE Request URL:', req.url);
  console.log('SSE Request path:', req.path);
  
  // Create SSE-specific proxy
  const sseProxy = createSSEProxy(APPOINTMENT_SERVICE_URL, 'appointment-guest-sse');
  sseProxy(req, res, next);
});

// Alternative SSE route pattern (if needed)
app.get('/appointment-guest-sse/notifstream', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('=== ALTERNATIVE SSE ROUTE DETECTED ===');
  console.log('SSE Request URL:', req.url);
  
  // Create SSE-specific proxy
  const sseProxy = createSSEProxy(APPOINTMENT_SERVICE_URL, 'appointment-sse-alt');
  sseProxy(req, res, next);
});


// Service route configuration
const serviceRoutes: Array<{
  path: string;
  target: string;
  serviceName: string;
}> = [
  // Core service routes
  {
    path: '/billing',
    target: BILLING_SERVICE_URL,
    serviceName: 'billing'
  },
  // {
  //   path: '/payments',
  //   target: BILLING_SERVICE_URL,
  //   serviceName: 'billing-payments'
  // },
  {
    path: '/webhooks',
    target: BILLING_SERVICE_URL,
    serviceName: 'webhooks'
  },
  {
    path: '/inventory',
    target: INVENTORY_SERVICE_URL,
    serviceName: 'inventory'
  },  
  {
    path: '/prescriptions',
    target: PRESCRIPTION_SERVICE_URL,
    serviceName: 'prescription'
  },

  // Cross-service routes (resources that might be shared or accessed from multiple services)
  // {
  //   path: '/api/users',
  //   target: BILLING_SERVICE_URL,
  //   serviceName: 'billing-users'
  // },
  // {
  //   path: '/api/patients',
  //   target: BILLING_SERVICE_URL,
  //   serviceName: 'billing-patients'
  // },
  // {
  //   path: '/api/suppliers',
  //   target: INVENTORY_SERVICE_URL,
  //   serviceName: 'inventory-suppliers'
  // },

  // Additional business routes
  // {
  //   path: '/api/prescription-appointments',
  //   target: PRESCRIPTION_SERVICE_URL,
  //   serviceName: 'prescription-appointments'
  // },
  {
    path: '/reports',
    target: BILLING_SERVICE_URL,
    serviceName: 'billing-reports'
  },

  // Appointment service routes
  {
    path: '/appointment',
    target: APPOINTMENT_SERVICE_URL,
    serviceName: 'appointment'
  },

  // Maintenance service routes
  {
    path: '/maintenance',
    target: MAINTENANCE_SERVICE_URL,
    serviceName: 'maintenance'
  },
  // {
  //   path: '/appointment/main',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-main'
  // },
  // {
  //   path: '/appointment/appointment-public',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-public'
  // },
  // {
  //   path: '/appointment/job',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-job'
  // },
  // {
  //   path: '/appointment/security',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-security'
  // },
  // {
  //   path: '/appointment/user',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-user'
  // },
  // {
  //   path: '/appointment/treatment',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-treatment'
  // },
  // {
  //   path: '/appointment/treatment-public',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-treatment-public'
  // },
  // {
  //   path: '/appointment/treatment-plan',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-treatment-plan'
  // },
  // {
  //   path: '/appointment/service',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-service'
  // },
  // {
  //   path: '/appointment/specialty',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-specialty'
  // },
  // {
  //   path: '/appointment/paymentMethod',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-payment'
  // },
  // {
  //   path: '/appointment/role',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-role'
  // },
  // {
  //   path: '/appointment/patient',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-patient'
  // },
  // {
  //   path: '/appointment/prescription',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-prescription'
  // },
  // {
  //   path: '/appointment/medical',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-medical'
  // },
  // {
  //   path: '/appointment/dental',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-dental'
  // },
  // {
  //   path: '/appointment/dentist',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-dentist'
  // },
  // {
  //   path: '/appointment/dashboard',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-dashboard'
  // },
  // {
  //   path: '/appointment/performance',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-performance'
  // },
  // {
  //   path: '/appointment/logs',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-logs'
  // },
  // {
  //   path: '/appointment/logs-public',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-logs-public'
  // },
  // {
  //   path: '/appointment/sms',
  //   target: APPOINTMENT_SERVICE_URL,
  //   serviceName: 'appointment-sms'
  // }
];

// Register all service routes with circuit breaker protection
serviceRoutes.forEach(route => {
  app.use(route.path, authenticate, (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Check circuit breaker
    if (isCircuitBreakerOpen(route.serviceName)) {
      logger.warn(`[${route.serviceName}] Circuit breaker is OPEN, rejecting request`);
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        service: route.serviceName,
        message: 'Circuit breaker is open due to repeated failures. Please try again later.',
        retryAfter: Math.ceil(CIRCUIT_BREAKER_TIMEOUT / 1000)
      });
    }

    // Create proxy with enhanced error handling
    const proxyMiddleware = createServiceProxy(route.target, route.serviceName);

    // Wrap the proxy to track success/failure
    const originalProxy = proxyMiddleware;
    const enhancedProxy = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const startTime = Date.now();

      // Override res.end to track response
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), cb?: (() => void)) {
        const duration = Date.now() - startTime;
        const success = res.statusCode ? res.statusCode < 500 : false;

        updateServiceHealth(route.serviceName, success);

        logger.info(`[${route.serviceName}] Request completed - Status: ${res.statusCode}, Duration: ${duration}ms`);

        // Call original end
        return originalEnd.call(this, chunk, encoding as BufferEncoding, cb);
      };

      originalProxy(req, res, next);
    };

    enhancedProxy(req, res, next);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    gateway: 'api-gateway',
    version: '1.0.0'
  });
});

// Service health checks with circuit breaker status
app.get('/api/health/services', async (req, res) => {
  const services = [
    { name: 'billing', url: `${BILLING_SERVICE_URL}/health` },
    { name: 'inventory', url: `${INVENTORY_SERVICE_URL}/health` },
    { name: 'prescription', url: `${PRESCRIPTION_SERVICE_URL}/health` },
    { name: 'appointment', url: `${APPOINTMENT_SERVICE_URL}/health` },
    { name: 'maintenance', url: `${MAINTENANCE_SERVICE_URL}/health` }
  ];

  const healthChecks = await Promise.allSettled(
    services.map(async (service) => {
      try {
        const response = await fetch(service.url, {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout for health checks
        });
        return {
          service: service.name,
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime: Date.now(),
          httpStatus: response.status,
          circuitBreaker: {
            isOpen: isCircuitBreakerOpen(service.name),
            health: serviceHealthCache.get(service.name) || { status: 'unknown', lastChecked: 0, failures: 0 }
          }
        };
      } catch (error) {
        return {
          service: service.name,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime: Date.now(),
          circuitBreaker: {
            isOpen: isCircuitBreakerOpen(service.name),
            health: serviceHealthCache.get(service.name) || { status: 'unknown', lastChecked: 0, failures: 0 }
          }
        };
      }
    })
  );

  const results = healthChecks.map((result, index) => ({
    ...services[index],
    ...result.status === 'fulfilled' ? result.value : {
      status: 'unhealthy',
      error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      responseTime: Date.now(),
      circuitBreaker: {
        isOpen: isCircuitBreakerOpen(services[index].name),
        health: serviceHealthCache.get(services[index].name) || { status: 'unknown', lastChecked: 0, failures: 0 }
      }
    }
  }));

  const allHealthy = results.every(service => service.status === 'healthy' && !service.circuitBreaker.isOpen);

  res.status(allHealthy ? 200 : 503).json({
    gateway: 'healthy',
    services: results,
    totalServices: results.length,
    healthyServices: results.filter(s => s.status === 'healthy').length,
    servicesWithCircuitBreaker: results.filter(s => s.circuitBreaker.isOpen).length,
    timestamp: new Date().toISOString()
  });
});

// Manual circuit breaker reset endpoint
app.post('/api/health/circuit-breaker/reset/:serviceName', (req, res) => {
  const { serviceName } = req.params;
  
  const health = serviceHealthCache.get(serviceName);
  if (health) {
    health.failures = 0;
    health.status = 'unknown';
    health.lastChecked = 0;
    serviceHealthCache.set(serviceName, health);
    
    logger.info(`Circuit breaker manually reset for service: ${serviceName}`);
    res.json({
      success: true,
      message: `Circuit breaker reset for ${serviceName}`,
      service: serviceName,
      newState: health
    });
  } else {
    res.status(404).json({
      success: false,
      message: `Service ${serviceName} not found in health cache`
    });
  }
});// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Note: Gateway doesn't need DB connection for proxying, only for auth
    // Database connection will be established when auth routes are called
    app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`API Gateway running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Billing Service: ${BILLING_SERVICE_URL}`);
      logger.info(`Inventory Service: ${INVENTORY_SERVICE_URL}`);
      logger.info(`Prescription Service: ${PRESCRIPTION_SERVICE_URL}`);
      logger.info(`Maintenance Service: ${MAINTENANCE_SERVICE_URL}`);
    });
  } catch (error) {
    logger.error('Failed to start API Gateway:', error);
    process.exit(1);
  }
};

startServer();

export default app;
