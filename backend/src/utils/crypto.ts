import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 10000;

// Fallback encryption key (must be at least 32 characters in production)
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'securepay_aes_256_super_secret_key_32_chars';

// Encrypt text using AES-256-GCM
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  const key = crypto.pbkdf2Sync(ENCRYPTION_SECRET, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: salt:iv:authTag:encryptedContent
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
};

// Decrypt text using AES-256-GCM
export const decrypt = (encryptedData: string): string => {
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }
  
  const salt = Buffer.from(parts[0], 'hex');
  const iv = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const encrypted = parts[3];
  
  const key = crypto.pbkdf2Sync(ENCRYPTION_SECRET, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Bcrypt helpers
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// TOTP (Google Authenticator) helpers
export const generateMfaSecret = (email: string) => {
  const secret = speakeasy.generateSecret({
    name: `SecurePay:${email}`,
    issuer: 'SecurePay',
  });
  return {
    otpauthUrl: secret.otpauth_url,
    base32: secret.base32,
  };
};

export const verifyTotpCode = (secret: string, token: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1, // 1 window step tolerance
  });
};

export const generateQrCodeDataUrl = async (otpauthUrl: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    throw new Error('Failed to generate QR Code Data URL');
  }
};
