import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { CustomError } from './errorHandler';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'securepay_jwt_access_token_secret_key_64_chars_long';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    phone: string;
    role: string;
    status: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      const err: CustomError = new Error('Access Token Required');
      err.statusCode = 401;
      return next(err);
    }

    jwt.verify(token, ACCESS_TOKEN_SECRET, async (err: any, decoded: any) => {
      if (err) {
        const customErr: CustomError = new Error(
          err.name === 'TokenExpiredError' ? 'Access Token Expired' : 'Invalid Access Token'
        );
        customErr.statusCode = 401;
        return next(customErr);
      }

      // Check if user is still active in the database
      const userRes = await query(
        'SELECT id, email, phone, role, status FROM users WHERE id = $1',
        [decoded.id]
      );

      if (userRes.rowCount === 0) {
        const customErr: CustomError = new Error('User not found');
        customErr.statusCode = 401;
        return next(customErr);
      }

      const user = userRes.rows[0];

      if (user.status === 'BLOCKED') {
        const customErr: CustomError = new Error('Your account is blocked. Please contact support.');
        customErr.statusCode = 403;
        return next(customErr);
      }

      req.user = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      };

      next();
    });
  } catch (error) {
    next(error);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const err: CustomError = new Error('Unauthorized');
      err.statusCode = 401;
      return next(err);
    }

    if (!roles.includes(req.user.role)) {
      const err: CustomError = new Error('Forbidden: Access Denied');
      err.statusCode = 403;
      return next(err);
    }

    next();
  };
};
