import { Response, NextFunction } from 'express';
import { query } from '../config/db';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

export const getDashboardStats = async (req: any, res: Response, next: NextFunction) => {
  try {
    // 1. Total volume & count of transactions
    const txnStats = await query(`
      SELECT 
        COALESCE(SUM(amount), 0.00) as total_volume,
        COUNT(id) as total_count,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as success_count,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_count
      FROM transactions
    `);

    // 2. Total registered users
    const userStats = await query(`
      SELECT 
        COUNT(id) as total_users,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'BLOCKED' THEN 1 END) as blocked_users
      FROM users
    `);

    // 3. Security violations count
    const securityStats = await query(`
      SELECT COUNT(id) as violations FROM security_logs WHERE severity IN ('HIGH', 'CRITICAL')
    `);

    res.status(200).json({
      status: 'success',
      data: {
        transactions: {
          totalVolume: parseFloat(txnStats.rows[0].total_volume),
          totalCount: parseInt(txnStats.rows[0].total_count),
          successCount: parseInt(txnStats.rows[0].success_count),
          failedCount: parseInt(txnStats.rows[0].failed_count),
        },
        users: {
          totalUsers: parseInt(userStats.rows[0].total_users),
          activeUsers: parseInt(userStats.rows[0].active_users),
          blockedUsers: parseInt(userStats.rows[0].blocked_users),
        },
        security: {
          highSeverityViolations: parseInt(securityStats.rows[0].violations),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req: any, res: Response, next: NextFunction) => {
  try {
    const usersRes = await query(`
      SELECT u.id, u.email, u.phone, u.role, u.status, u.is_mfa_enabled, u.created_at,
             w.balance, w.upi_id
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      ORDER BY u.created_at DESC
    `);

    res.status(200).json({
      status: 'success',
      data: {
        users: usersRes.rows.map(row => ({
          ...row,
          balance: parseFloat(row.balance || '0.00'),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserBlock = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { status } = req.body; // 'ACTIVE' or 'BLOCKED'

    if (!['ACTIVE', 'BLOCKED'].includes(status)) {
      const err: CustomError = new Error('Invalid status. Must be ACTIVE or BLOCKED');
      err.statusCode = 400;
      return next(err);
    }

    // Check if target user is an Admin
    const targetUser = await query('SELECT role, email FROM users WHERE id = $1', [userId]);
    if (targetUser.rowCount === 0) {
      const err: CustomError = new Error('User not found');
      err.statusCode = 404;
      return next(err);
    }

    if (targetUser.rows[0].role === 'ADMIN') {
      const err: CustomError = new Error('Administrative accounts cannot be blocked');
      err.statusCode = 400;
      return next(err);
    }

    await query('UPDATE users SET status = $1 WHERE id = $2', [status, userId]);

    // Log administrative action
    await query(
      `INSERT INTO security_logs (user_id, event_type, severity, details, ip_address) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        status === 'BLOCKED' ? 'USER_BLOCKED_BY_ADMIN' : 'USER_UNBLOCKED_BY_ADMIN',
        'HIGH',
        JSON.stringify({ targetUserId: userId, targetEmail: targetUser.rows[0].email }),
        req.ip || 'unknown',
      ]
    );

    logger.info(`Admin ${req.user.id} toggled block status for user ${userId} to ${status}`);

    res.status(200).json({
      status: 'success',
      message: `User status successfully updated to ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

export const getSecurityLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const logsRes = await query(`
      SELECT s.id, s.event_type, s.severity, s.details, s.ip_address, s.created_at,
             u.email, u.phone
      FROM security_logs s
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);

    res.status(200).json({
      status: 'success',
      data: {
        logs: logsRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};
