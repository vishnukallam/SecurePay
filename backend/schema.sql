-- ==========================================
-- SecurePay Database Management System Schema
-- PostgreSQL Version Compatibility: 12+
-- Description: Complete production schema with tables, constraints, and optimization indexes.
-- ==========================================

-- Enable the pgcrypto extension to support cryptographic functions (e.g., gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------
-- 1. USERS TABLE
-- Stores user identity, authentication roles, status, and MFA configurations.
-- ------------------------------------------
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

-- Add comments for documentation
COMMENT ON COLUMN users.role IS 'User roles: USER, ADMIN';
COMMENT ON COLUMN users.status IS 'Account status: ACTIVE, BLOCKED';

-- ------------------------------------------
-- 2. WALLETS TABLE
-- Stores wallet balances, currency parameters, and encrypted UPI PIN credentials.
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    upi_id VARCHAR(50) UNIQUE NOT NULL,
    upi_pin VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------
-- 3. TRANSACTIONS TABLE
-- Stores all money transfers, utility bill payments, and cash loads.
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'TRANSFER', 'RECHARGE', 'BILL', 'MERCHANT', 'WALLET_ADD'
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED'
    encrypted_metadata TEXT NOT NULL, -- AES-256 encrypted JSON metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------
-- 4. MFA OTPS TABLE
-- Stores temporary authentication OTP codes sent to users for high-value checks.
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS mfa_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'EMAIL', 'SMS'
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------
-- 5. SESSIONS TABLE
-- Stores device sessions and active refresh tokens to support rotation & revocation.
-- ------------------------------------------
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

-- ------------------------------------------
-- 6. DEVICES TABLE
-- Track user logins by device fingerprint for threat analysis and trusted devices.
-- ------------------------------------------
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

-- ------------------------------------------
-- 7. REWARDS TABLE
-- Tracks user welcome cashback and transaction reward events.
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    description VARCHAR(255) NOT NULL,
    claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------
-- 8. SECURITY LOGS TABLE
-- Stores high-level audit logs for security, login failures, and admin blocks.
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL, -- 'LOGIN_FAILED', 'SUSPICIOUS_TRANSFER', etc.
    severity VARCHAR(20) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    details JSONB,
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- PERFORMANCE INDEXES & QUERY OPTIMIZATION
-- =-----------------------------------------
-- These indexes prevent sequential scans on large datasets and speed up dashboard loads.
-- ==========================================

-- Indexes for users and logins
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_sender_id ON transactions (sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_id ON transactions (receiver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);

-- Indexes for wallet lookups
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_upi_id ON wallets (upi_id);

-- Indexes for sessions & active tokens
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions (refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

-- Indexes for audit & security logs
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs (severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs (created_at DESC);
