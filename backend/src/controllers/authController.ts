import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { CustomError } from '../middleware/errorHandler';
import { signupSchema, loginSchema, verifyMfaSchema, changePasswordSchema } from '../validators/auth';
import {
  hashPassword,
  comparePassword,
  generateMfaSecret,
  verifyTotpCode,
  generateQrCodeDataUrl,
} from '../utils/crypto';
import { logger } from '../config/logger';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'securepay_jwt_access_token_secret_key_64_chars_long';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'securepay_jwt_refresh_token_secret_key_64_chars_long';

// Helper to generate JWT tokens
const generateTokens = (user: { id: string; email: string; phone: string; role: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, phone: user.phone, role: user.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Clear Refresh Token Cookie
const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = signupSchema.parse(req.body);
    const { email, phone, password } = validatedData;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      const err: CustomError = new Error('Email or Phone number already registered');
      err.statusCode = 400;
      return next(err);
    }

    const hashedPassword = await hashPassword(password);

    // Start database transaction
    await query('BEGIN');

    // Create user
    const userRes = await query(
      'INSERT INTO users (email, phone, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, phone, role',
      [email, phone, hashedPassword, 'USER']
    );

    const user = userRes.rows[0];

    // Create a simulation UPI ID (e.g., phone@securepay)
    const upiId = `${phone}@securepay`;
    // Create random encrypted UPI PIN hash (default, user can change later)
    const defaultUpiPinHash = await hashPassword('123456');

    // Create Wallet
    await query(
      'INSERT INTO wallets (user_id, balance, upi_id, upi_pin) VALUES ($1, $2, $3, $4)',
      [user.id, 1000.00, upiId, defaultUpiPinHash] // Starting bonus of 1000 INR
    );

    // Initial signups get standard reward
    await query(
      "INSERT INTO rewards (user_id, amount, description, claimed) VALUES ($1, $2, $3, TRUE)",
      [user.id, 50.00, 'Welcome Reward points', true]
    );

    await query('COMMIT');

    logger.info(`User registered successfully: ${email}`);

    res.status(201).json({
      status: 'success',
      message: 'Signup successful! Please proceed to secure your account with MFA.',
      data: {
        userId: user.id,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    await query('ROLLBACK');
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { identifier, password, deviceFingerprint } = validatedData;

    // Search user by email or phone
    const userRes = await query(
      'SELECT id, email, phone, password_hash, role, status, is_mfa_enabled, mfa_secret FROM users WHERE email = $1 OR phone = $1',
      [identifier]
    );

    if (userRes.rowCount === 0) {
      const err: CustomError = new Error('Invalid email, phone, or password');
      err.statusCode = 401;
      return next(err);
    }

    const user = userRes.rows[0];

    if (user.status === 'BLOCKED') {
      const err: CustomError = new Error('This account has been blocked. Contact admin.');
      err.statusCode = 403;
      return next(err);
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      // Log failed attempt
      await query(
        'INSERT INTO security_logs (user_id, event_type, severity, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [user.id, 'LOGIN_FAILED', 'MEDIUM', JSON.stringify({ deviceFingerprint }), req.ip || 'unknown']
      );
      
      const err: CustomError = new Error('Invalid email, phone, or password');
      err.statusCode = 401;
      return next(err);
    }

    // If MFA is not yet configured, direct them to setup.
    // If MFA is configured, require MFA code
    if (user.is_mfa_enabled) {
      return res.status(200).json({
        status: 'success',
        message: 'MFA verification required',
        data: {
          userId: user.id,
          isMfaRequired: true,
        },
      });
    }

    // If MFA is not configured, generate a secret for setup
    const mfaSetup = generateMfaSecret(user.email);
    const qrCodeDataUrl = await generateQrCodeDataUrl(mfaSetup.otpauthUrl || '');

    // Temp save secret in database so they can verify and complete setup
    await query(
      'UPDATE users SET mfa_secret = $1 WHERE id = $2',
      [mfaSetup.base32, user.id]
    );

    res.status(200).json({
      status: 'success',
      message: 'MFA setup required',
      data: {
        userId: user.id,
        isMfaSetupRequired: true,
        qrCodeUrl: qrCodeDataUrl,
        secret: mfaSetup.base32,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyMfa = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = verifyMfaSchema.parse(req.body);
    const { userId, code, deviceFingerprint } = validatedData;

    const userRes = await query(
      'SELECT id, email, phone, role, status, is_mfa_enabled, mfa_secret FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rowCount === 0) {
      const err: CustomError = new Error('User not found');
      err.statusCode = 404;
      return next(err);
    }

    const user = userRes.rows[0];

    if (!user.mfa_secret) {
      const err: CustomError = new Error('MFA has not been configured yet');
      err.statusCode = 400;
      return next(err);
    }

    const isValid = verifyTotpCode(user.mfa_secret, code);
    if (!isValid) {
      // Log security violation
      await query(
        'INSERT INTO security_logs (user_id, event_type, severity, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [user.id, 'MFA_FAILED', 'HIGH', JSON.stringify({ deviceFingerprint }), req.ip || 'unknown']
      );

      const err: CustomError = new Error('Invalid authentication code');
      err.statusCode = 401;
      return next(err);
    }

    // Enable MFA if it wasn't enabled yet
    if (!user.is_mfa_enabled) {
      await query('UPDATE users SET is_mfa_enabled = TRUE WHERE id = $1', [userId]);
    }

    // Register or update device information
    await query(
      `INSERT INTO devices (user_id, device_fingerprint, ip_address, is_trusted, last_seen)
       VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, device_fingerprint)
       DO UPDATE SET last_seen = CURRENT_TIMESTAMP, ip_address = $3`,
      [user.id, deviceFingerprint, req.ip || 'unknown']
    );

    // Issue standard tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save session in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query(
      'INSERT INTO sessions (user_id, refresh_token, device_fingerprint, ip_address, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [user.id, refreshToken, deviceFingerprint, req.ip || 'unknown', expiresAt]
    );

    setRefreshTokenCookie(res, refreshToken);

    logger.info(`User authenticated: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'MFA verified and login successful!',
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      const err: CustomError = new Error('Refresh Token Required');
      err.statusCode = 401;
      return next(err);
    }

    // Check session validity in database
    const sessionRes = await query(
      'SELECT id, user_id, is_revoked FROM sessions WHERE refresh_token = $1 AND is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );

    if (sessionRes.rowCount === 0) {
      const err: CustomError = new Error('Invalid or expired session');
      err.statusCode = 401;
      return next(err);
    }

    const session = sessionRes.rows[0];

    jwt.verify(token, REFRESH_TOKEN_SECRET, async (err: any, decoded: any) => {
      if (err) {
        const customErr: CustomError = new Error('Invalid refresh token');
        customErr.statusCode = 401;
        return next(customErr);
      }

      const userRes = await query(
        'SELECT id, email, phone, role, status FROM users WHERE id = $1',
        [session.user_id]
      );

      if (userRes.rowCount === 0 || userRes.rows[0].status === 'BLOCKED') {
        const customErr: CustomError = new Error('User inactive or not found');
        customErr.statusCode = 401;
        return next(customErr);
      }

      const user = userRes.rows[0];

      // Rotate tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

      // Start database transaction to replace the refresh token (session rotation)
      await query('BEGIN');
      
      // Revoke old session
      await query('UPDATE sessions SET is_revoked = TRUE WHERE refresh_token = $1', [token]);

      // Save new session
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await query(
        'INSERT INTO sessions (user_id, refresh_token, device_fingerprint, ip_address, expires_at) VALUES ($1, $2, $3, $4, $5)',
        [user.id, newRefreshToken, 'ROTATED_DEVICE', req.ip || 'unknown', expiresAt]
      );

      await query('COMMIT');

      setRefreshTokenCookie(res, newRefreshToken);

      res.status(200).json({
        status: 'success',
        data: {
          accessToken,
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
          },
        },
      });
    });
  } catch (error) {
    await query('ROLLBACK');
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      // Revoke the session in DB
      await query('UPDATE sessions SET is_revoked = TRUE WHERE refresh_token = $1', [token]);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const err: CustomError = new Error('Unauthorized');
      err.statusCode = 401;
      return next(err);
    }

    const userRes = await query(
      `SELECT u.id, u.email, u.phone, u.role, u.is_mfa_enabled, u.created_at,
              w.balance, w.upi_id,
              COALESCE(SUM(r.amount) FILTER (WHERE r.claimed = TRUE), 0.00) as total_rewards
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       LEFT JOIN rewards r ON r.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, w.balance, w.upi_id`,
      [userId]
    );

    if (userRes.rowCount === 0) {
      const err: CustomError = new Error('User not found');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: userRes.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;

    const userRes = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rowCount === 0) {
      const err: CustomError = new Error('User not found');
      err.statusCode = 404;
      return next(err);
    }

    const user = userRes.rows[0];
    const isPasswordValid = await comparePassword(currentPassword, user.password_hash);
    
    if (!isPasswordValid) {
      const err: CustomError = new Error('Invalid current password');
      err.statusCode = 400;
      return next(err);
    }

    const newHashedPassword = await hashPassword(newPassword);
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHashedPassword, userId]
    );

    // Log password change
    await query(
      'INSERT INTO security_logs (user_id, event_type, severity, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'PASSWORD_CHANGED', 'LOW', JSON.stringify({}), req.ip || 'unknown']
    );

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
