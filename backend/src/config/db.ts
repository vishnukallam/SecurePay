import { Pool } from 'pg';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/securepay';

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle pg client', err);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.info('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('database query error', { text, error });
    throw error;
  }
};

export const initDb = async () => {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'USER',
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      is_mfa_enabled BOOLEAN DEFAULT FALSE,
      mfa_secret VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const walletsTable = `
    CREATE TABLE IF NOT EXISTS wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      upi_id VARCHAR(50) UNIQUE NOT NULL,
      upi_pin VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const transactionsTable = `
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
      receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
      amount DECIMAL(15, 2) NOT NULL,
      type VARCHAR(50) NOT NULL, -- 'TRANSFER', 'RECHARGE', 'BILL', 'MERCHANT', 'WALLET_ADD'
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED'
      encrypted_metadata TEXT NOT NULL, -- AES encrypted JSON metadata
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const mfaOtpsTable = `
    CREATE TABLE IF NOT EXISTS mfa_otps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL, -- 'EMAIL', 'SMS'
      code_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const sessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token VARCHAR(512) NOT NULL UNIQUE,
      device_fingerprint VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      is_revoked BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const devicesTable = `
    CREATE TABLE IF NOT EXISTS devices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_fingerprint VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      is_trusted BOOLEAN DEFAULT FALSE,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, device_fingerprint)
    );
  `;

  const rewardsTable = `
    CREATE TABLE IF NOT EXISTS rewards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
      description VARCHAR(255) NOT NULL,
      claimed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const securityLogsTable = `
    CREATE TABLE IF NOT EXISTS security_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      event_type VARCHAR(100) NOT NULL, -- 'LOGIN_FAILED', 'SUSPICIOUS_TRANSFER', etc.
      severity VARCHAR(20) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
      details JSONB,
      ip_address VARCHAR(45) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    logger.info('Initializing Database Tables...');
    await query(usersTable);
    await query(walletsTable);
    await query(transactionsTable);
    await query(mfaOtpsTable);
    await query(sessionsTable);
    await query(devicesTable);
    await query(rewardsTable);
    await query(securityLogsTable);
    logger.info('Database Tables Initialized successfully!');
  } catch (error) {
    logger.error('Failed to initialize database tables', error);
    throw error;
  }
};
