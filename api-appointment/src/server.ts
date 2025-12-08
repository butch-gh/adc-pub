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
import jobRoutes from './routes/job';
import securityRoutes from './routes/security';
import userRoutes from './routes/user';
import treatmentRoutes from './routes/treatment';
import treatmentPublicRoutes from './routes/treatment-public';
import treatmentPlanRoutes from './routes/treatment-plan';
import treatmentPlanHeaderRoutes from './routes/treatment-plan-header';
import treatmentPlanEntryRoutes from './routes/treatment-plan-entry';
import serviceRoutes from './routes/service';
import specialtyRoutes from './routes/specialty';
import pmethodRoutes from './routes/paymentMethod';
import roleRoutes from './routes/role';
import patientRoutes from './routes/patient';
import billingRoutes from './routes/billing';
import appointmentRoutes from './routes/appointment';
import appointmentPublicRoutes from './routes/appointment-guest';
import appointmentPublicSSERoutes from './routes/appointment-guest-sse';
import prescriptionRoutes from './routes/prescription';
import medicalRoutes from './routes/medical';
import dentalRoutes from './routes/dental';
import dentistRoutes from './routes/dentist';
import dashboardRoutes from './routes/dashboard';
import performanceRoutes from './routes/performance';
import logsRoutes from './routes/logs';
import logsPublicRoutes from './routes/logs-public';
//import smsRoutes from './routes/sms';
import smsRoutes from './routes/sms-semaphore';
import emailRoutes from './routes/email';
import guest from './routes/guest';

const app = express();
const PORT = process.env.APPOINTMENT_PORT || 5006;

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
    console.log(`[APPOINTMENT-SERVICE] Request timeout for ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        success: false, 
        message: 'Request timeout' 
      });
    }
  });
  
  res.setTimeout(30000, () => {
    console.log(`[APPOINTMENT-SERVICE] Response timeout for ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        success: false, 
        message: 'Response timeout' 
      });
    }
  });
  
  next();
});

// Simple request logging middleware
app.use((req, res, next) => {
  console.log(`[APPOINTMENT-SERVICE] ${req.method} ${req.url}`);
  //console.log(`[APPOINTMENT-SERVICE] Headers:`, req.headers);
  console.log(`[APPOINTMENT-SERVICE] Body:`, req.body);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'appointment',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/', (req, res) => {
  res.send("Welcome to ADC Appointment API Service.");
});

// API Routes
app.use('/job', jobRoutes);
app.use('/security', securityRoutes);
app.use('/user', userRoutes);
app.use('/treatment', treatmentRoutes);
app.use('/treatment-public', treatmentPublicRoutes);
app.use('/treatment-plan', treatmentPlanRoutes);
app.use('/treatment-plan-header', treatmentPlanHeaderRoutes);
app.use('/treatment-plan-entry', treatmentPlanEntryRoutes);
app.use('/service', serviceRoutes);
app.use('/specialty', specialtyRoutes);
app.use('/paymentMethod', pmethodRoutes);
app.use('/role', roleRoutes);
app.use('/patient', patientRoutes);
app.use('/billing', billingRoutes);
app.use('/appointment', appointmentRoutes);
app.use('/appointment-guest', appointmentPublicRoutes);
app.use('/appointment-guest-sse', appointmentPublicSSERoutes);
app.use('/prescription', prescriptionRoutes);
app.use('/medical', medicalRoutes);
app.use('/dental', dentalRoutes);
app.use('/dentist', dentistRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/performance', performanceRoutes);
app.use('/logs', logsRoutes);
app.use('/logs-public', logsPublicRoutes);
app.use('/sms', smsRoutes);
app.use('/email', emailRoutes);
app.use('/guest', guest);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    service: 'appointment'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`Appointment API Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start Appointment API Service:', error);
    process.exit(1);
  }
};

startServer();

export default app;