import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number cannot exceed 15 digits')
    .regex(/^[0-9+]+$/, 'Phone number must contain only digits or +'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Phone is required'), // accepts email or phone
  password: z.string().min(1, 'Password is required'),
  deviceFingerprint: z.string().min(1, 'Device fingerprint is required'),
});

export const verifyMfaSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
  deviceFingerprint: z.string().min(1, 'Device fingerprint is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});
