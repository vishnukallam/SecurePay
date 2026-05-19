import { z } from 'zod';

export const addMoneySchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
  cardHolder: z.string().min(1, 'Card holder name is required'),
  cardNumber: z.string().min(16, 'Card number must be 16 digits').max(16),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, 'Expiry must be in MM/YY format'),
  cvv: z.string().min(3, 'CVV must be 3 digits').max(3),
});

export const transferSchema = z.object({
  recipient: z.string().min(1, 'Recipient (Email, Phone, or UPI ID) is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  upiPin: z.string().length(6, 'UPI PIN must be exactly 6 digits'),
  otpCode: z.string().length(6, 'High-value transaction OTP must be 6 digits').optional(),
});

export const setUpiPinSchema = z.object({
  upiPin: z.string().length(6, 'UPI PIN must be exactly 6 digits'),
  password: z.string().min(1, 'Password is required to change/set UPI PIN'),
});

export const payBillSchema = z.object({
  type: z.enum(['MOBILE', 'DTH', 'ELECTRICITY', 'WATER', 'GAS', 'FASTTAG']),
  billerId: z.string().min(1, 'Biller account / identification number is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  upiPin: z.string().length(6, 'UPI PIN must be exactly 6 digits'),
});
