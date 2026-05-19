import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import { Request, Response, NextFunction } from 'express';
// @ts-ignore
import xss from 'xss-clean';

// Dynamic CORS configuration parsing
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : [];

// Standard Vercel domains and local dev URLs to ensure immediate resolution on deploy
const vercelFallbacks = [
  'https://secure-pay-gamma.vercel.app',
  'https://secure-pay-psi.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

vercelFallbacks.forEach((host) => {
  if (!allowedOrigins.includes(host)) {
    allowedOrigins.push(host);
  }
});

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow server-to-server or non-browser/cURL requests where origin is undefined
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
});

// Helmet Configuration
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true,
});

// General API Rate Limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

// Strict Rate Limiter for sensitive Auth operations (Login, Signup, OTP, Transfer)
export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window for login/register/otp
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many login or high-value security attempts, please try again after 15 minutes',
  },
});

// XSS Sanitizer Middleware using xss-clean
export const xssSanitizer = xss();

// Parameter Pollution Protection
export const hppProtection = hpp();

// Custom Input Sanitization to strip potential script/SQL tags
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (val: any): any => {
    if (typeof val === 'string') {
      return val.replace(/<[^>]*>/g, '').trim(); // Remove tags & trim
    }
    if (typeof val === 'object' && val !== null) {
      for (const key in val) {
        val[key] = sanitize(val[key]);
      }
    }
    return val;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
};
