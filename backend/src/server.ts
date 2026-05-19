import express from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors'; // Async error handling support

// Configurations & DB
import { initDb } from './config/db';
import { logger, morganStream } from './config/logger';

// Middlewares
import {
  corsMiddleware,
  helmetMiddleware,
  apiLimiter,
  xssSanitizer,
  hppProtection,
  sanitizeInputs,
} from './middleware/security';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/authRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';

// Load Environment Variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Apply Security Middlewares
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json({ limit: '10kb' })); // Body parser with size limit to prevent Denial of Service (DoS)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging HTTP Requests
app.use(morgan('combined', { stream: morganStream }));

// Parameter Pollution & XSS protection
app.use(hppProtection);
app.use(xssSanitizer);
app.use(sanitizeInputs);

// Apply Global Rate Limiting
app.use(apiLimiter);

// Health check route
app.get('/api/v1/ping', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'SecurePay API Gateway is active',
    timestamp: new Date(),
  });
});

// Root path health check (for Render load balancer uptime pings)
app.route('/').get((req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'SecurePay API Server is active and healthy',
    timestamp: new Date(),
  });
}).head((req, res) => {
  res.status(200).end();
});

// Register Module Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);

// Unhandled route handler
app.all('*', (req, res, next) => {
  const err: any = new Error(`Resource ${req.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
});

// Global Error Handler
app.use(errorHandler);

// Initialize DB and Listen
const startServer = async () => {
  try {
    await initDb();
    
    // Quick validation of the initial Admin account creation
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@securepay.com';
    const adminPhone = process.env.ADMIN_PHONE || '9999999999';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    
    const { query } = require('./config/db');
    const { hashPassword } = require('./utils/crypto');
    
    const adminRes = await query('SELECT id FROM users WHERE role = $1', ['ADMIN']);
    if (adminRes.rowCount === 0) {
      logger.info('No admin account found. Creating a default secure ADMIN account...');
      const hashedPass = await hashPassword(adminPassword);
      await query(
        'INSERT INTO users (email, phone, password_hash, role) VALUES ($1, $2, $3, $4)',
        [adminEmail, adminPhone, hashedPass, 'ADMIN']
      );
      logger.info(`Default admin account created: ${adminEmail}`);
    }

    app.listen(PORT, () => {
      logger.info(`SecurePay Server successfully running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start SecurePay Server', error);
    process.exit(1);
  }
};

startServer();
