import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export interface CustomError extends Error {
  statusCode?: number;
  errors?: any;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`, {
    stack: err.stack,
    errors: err.errors,
  });

  res.status(statusCode).json({
    status: 'error',
    message,
    errors: err.errors || null,
    // Hide details in production
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};
