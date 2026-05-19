import { Response, NextFunction } from 'express';
import { query, pool } from '../config/db';
import { CustomError } from '../middleware/errorHandler';
import { addMoneySchema, transferSchema, setUpiPinSchema, payBillSchema } from '../validators/payment';
import { encrypt, decrypt, comparePassword, hashPassword } from '../utils/crypto';
import { logger } from '../config/logger';

// Helper to generate cashback rewards (e.g., 10% chance of winning between 5 and 100 INR for transfers over 100 INR)
const handleCashbackReward = async (client: any, userId: string, amount: number) => {
  if (amount >= 100 && Math.random() < 0.20) { // 20% chance
    const rewardAmount = parseFloat((Math.random() * (50 - 5) + 5).toFixed(2));
    await client.query(
      "INSERT INTO rewards (user_id, amount, description, claimed) VALUES ($1, $2, $3, TRUE)",
      [userId, rewardAmount, `Cashback for transfer of ₹${amount}`, true]
    );

    // Update wallet balance directly
    await client.query(
      "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
      [rewardAmount, userId]
    );
    return rewardAmount;
  }
  return 0;
};

export const getWalletInfo = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const walletRes = await query(
      'SELECT id, balance, currency, upi_id FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (walletRes.rowCount === 0) {
      const err: CustomError = new Error('Wallet not found for this user');
      err.statusCode = 404;
      return next(err);
    }

    res.status(200).json({
      status: 'success',
      data: {
        wallet: walletRes.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addMoney = async (req: any, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const validatedData = addMoneySchema.parse(req.body);
    const { amount, cardNumber, cardHolder } = validatedData;
    const userId = req.user.id;

    // Start transaction
    await client.query('BEGIN');

    // Retrieve and lock wallet row to prevent concurrent race conditions
    const walletRes = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (walletRes.rowCount === 0) {
      const err: CustomError = new Error('Wallet not found');
      err.statusCode = 404;
      await client.query('ROLLBACK');
      client.release();
      return next(err);
    }

    const wallet = walletRes.rows[0];
    const newBalance = parseFloat(wallet.balance) + amount;

    // Update wallet balance
    await client.query(
      'UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [newBalance, userId]
    );

    // Encrypt card info / transfer details before DB write for maximum security
    const metadata = JSON.stringify({
      cardHolder,
      last4Digits: cardNumber.slice(-4),
      transactionSource: 'CARD_GATEWAY',
    });
    const encryptedMetadata = encrypt(metadata);

    // Save transaction record
    await client.query(
      `INSERT INTO transactions (sender_id, receiver_id, amount, type, status, encrypted_metadata)
       VALUES (NULL, $1, $2, 'WALLET_ADD', 'SUCCESS', $3)`,
      [userId, amount, encryptedMetadata]
    );

    await client.query('COMMIT');
    client.release();

    logger.info(`Successfully added ₹${amount} to wallet of user ${userId}`);

    res.status(200).json({
      status: 'success',
      message: `Successfully added ₹${amount.toFixed(2)} to your wallet!`,
      data: {
        newBalance,
      },
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollError) {
      // Ignore rollback errors if transaction was not active
    }
    client.release();
    next(error);
  }
};

export const transferMoney = async (req: any, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const validatedData = transferSchema.parse(req.body);
    const { recipient, amount, upiPin, otpCode } = validatedData;
    const senderId = req.user.id;

    // Check if high-value transaction requires OTP simulation
    const HIGH_VALUE_THRESHOLD = 5000;
    if (amount >= HIGH_VALUE_THRESHOLD && !otpCode) {
      // Create and save temporary OTP for transaction confirmation
      const otp = '123456'; // Simulated transaction OTP
      const otpHash = await hashPassword(otp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

      await client.query(
        'INSERT INTO mfa_otps (user_id, type, code_hash, expires_at) VALUES ($1, $2, $3, $4)',
        [senderId, 'EMAIL', otpHash, expiresAt]
      );

      client.release();
      return res.status(200).json({
        status: 'otp_required',
        message: 'High-value transaction: An OTP code has been sent to your registered email for validation.',
      });
    }

    if (amount >= HIGH_VALUE_THRESHOLD && otpCode) {
      // Validate OTP
      const otpRes = await client.query(
        `SELECT id, code_hash FROM mfa_otps 
         WHERE user_id = $1 AND type = 'EMAIL' AND expires_at > CURRENT_TIMESTAMP 
         ORDER BY created_at DESC LIMIT 1`,
        [senderId]
      );

      if (otpRes.rowCount === 0) {
        const err: CustomError = new Error('OTP expired or invalid');
        err.statusCode = 400;
        client.release();
        return next(err);
      }

      const isOtpValid = await comparePassword(otpCode, otpRes.rows[0].code_hash);
      if (!isOtpValid) {
        // Log suspicious high-value failure
        await client.query(
          'INSERT INTO security_logs (user_id, event_type, severity, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
          [senderId, 'HIGH_VALUE_OTP_FAILED', 'HIGH', JSON.stringify({ amount }), req.ip || 'unknown']
        );
        const err: CustomError = new Error('Invalid OTP code');
        err.statusCode = 400;
        client.release();
        return next(err);
      }

      // Cleanup OTP
      await client.query('DELETE FROM mfa_otps WHERE id = $1', [otpRes.rows[0].id]);
    }

    // Lookup recipient (can be Email, Phone, or UPI ID)
    const recipientRes = await client.query(
      `SELECT u.id, u.email, u.phone, u.status, w.upi_id 
       FROM users u
       JOIN wallets w ON w.user_id = u.id
       WHERE u.email = $1 OR u.phone = $1 OR w.upi_id = $1`,
      [recipient]
    );

    if (recipientRes.rowCount === 0) {
      const err: CustomError = new Error('Recipient not found or does not have a linked wallet');
      err.statusCode = 404;
      client.release();
      return next(err);
    }

    const receiver = recipientRes.rows[0];

    if (receiver.id === senderId) {
      const err: CustomError = new Error('Cannot transfer money to yourself');
      err.statusCode = 400;
      client.release();
      return next(err);
    }

    if (receiver.status === 'BLOCKED') {
      const err: CustomError = new Error('Cannot transfer money to a blocked recipient account');
      err.statusCode = 403;
      client.release();
      return next(err);
    }

    // Start Database Transaction
    await client.query('BEGIN');

    // Retrieve sender wallet + UPI PIN and Row-Lock it
    const senderWalletRes = await client.query(
      'SELECT id, balance, upi_pin, upi_id FROM wallets WHERE user_id = $1 FOR UPDATE',
      [senderId]
    );

    if (senderWalletRes.rowCount === 0) {
      const err: CustomError = new Error('Sender wallet not found');
      err.statusCode = 404;
      await client.query('ROLLBACK');
      client.release();
      return next(err);
    }

    const senderWallet = senderWalletRes.rows[0];

    // Validate UPI PIN
    const isPinValid = await comparePassword(upiPin, senderWallet.upi_pin);
    if (!isPinValid) {
      // Log failed UPI PIN attempt
      await client.query(
        'INSERT INTO security_logs (user_id, event_type, severity, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [senderId, 'INVALID_UPI_PIN', 'MEDIUM', JSON.stringify({ amount }), req.ip || 'unknown']
      );

      const err: CustomError = new Error('Invalid UPI PIN');
      err.statusCode = 400;
      await client.query('ROLLBACK');
      client.release();
      return next(err);
    }

    // Validate Sender Balance
    const senderBalance = parseFloat(senderWallet.balance);
    if (senderBalance < amount) {
      const err: CustomError = new Error('Insufficient wallet balance');
      err.statusCode = 400;
      await client.query('ROLLBACK');
      client.release();
      return next(err);
    }

    // Retrieve and Row-Lock Receiver's Wallet
    const receiverWalletRes = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [receiver.id]
    );

    if (receiverWalletRes.rowCount === 0) {
      const err: CustomError = new Error('Recipient wallet not found');
      err.statusCode = 404;
      await client.query('ROLLBACK');
      client.release();
      return next(err);
    }

    const receiverWallet = receiverWalletRes.rows[0];

    // Update balances
    const newSenderBalance = senderBalance - amount;
    const newReceiverBalance = parseFloat(receiverWallet.balance) + amount;

    await client.query('UPDATE wallets SET balance = $1 WHERE user_id = $2', [newSenderBalance, senderId]);
    await client.query('UPDATE wallets SET balance = $1 WHERE user_id = $2', [newReceiverBalance, receiver.id]);

    // Encrypt transfer metadata for privacy/compliance (AES-256-GCM)
    const metadata = JSON.stringify({
      senderUpiId: senderWallet.upi_id,
      receiverUpiId: receiver.upi_id,
      memo: 'Mobile Instant UPI Payment',
    });
    const encryptedMetadata = encrypt(metadata);

    // Save transaction
    await client.query(
      `INSERT INTO transactions (sender_id, receiver_id, amount, type, status, encrypted_metadata)
       VALUES ($1, $2, $3, 'TRANSFER', 'SUCCESS', $4)`,
      [senderId, receiver.id, amount, encryptedMetadata]
    );

    // Handle Cashback Rewards
    const cashback = await handleCashbackReward(client, senderId, amount);

    await client.query('COMMIT');
    client.release();

    logger.info(`Successful P2P Transfer of ₹${amount} from user ${senderId} to receiver ${receiver.id}`);

    res.status(200).json({
      status: 'success',
      message: `Successfully transferred ₹${amount.toFixed(2)} to ${receiver.email}!`,
      data: {
        newBalance: newSenderBalance,
        cashbackWon: cashback,
      },
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollError) {
      // Ignore rollback errors if transaction was not active
    }
    client.release();
    next(error);
  }
};

export const getTransactionHistory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type; // Optional filter: TRANSFER, BILL, RECHARGE, WALLET_ADD
    const status = req.query.status; // Optional filter: SUCCESS, FAILED, PENDING

    let queryText = `
      SELECT t.id, t.sender_id, t.receiver_id, t.amount, t.type, t.status, t.encrypted_metadata, t.created_at,
             u_send.email as sender_email, u_send.phone as sender_phone,
             u_rec.email as receiver_email, u_rec.phone as receiver_phone
      FROM transactions t
      LEFT JOIN users u_send ON u_send.id = t.sender_id
      LEFT JOIN users u_rec ON u_rec.id = t.receiver_id
      WHERE (t.sender_id = $1 OR t.receiver_id = $1)
    `;

    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (type) {
      queryText += ` AND t.type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND t.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const historyRes = await query(queryText, queryParams);

    // Decrypt details of transactions
    const decryptedTransactions = historyRes.rows.map((row) => {
      let decryptedMeta = {};
      try {
        if (row.encrypted_metadata) {
          decryptedMeta = JSON.parse(decrypt(row.encrypted_metadata));
        }
      } catch (err) {
        logger.warn(`Failed to decrypt metadata for transaction ${row.id}`);
      }

      return {
        id: row.id,
        senderId: row.sender_id,
        senderEmail: row.sender_email || 'Wallet Load System',
        senderPhone: row.sender_phone || '',
        receiverId: row.receiver_id,
        receiverEmail: row.receiver_email,
        receiverPhone: row.receiver_phone,
        amount: parseFloat(row.amount),
        type: row.type,
        status: row.status,
        metadata: decryptedMeta,
        createdAt: row.created_at,
        isDebit: row.sender_id === userId,
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        transactions: decryptedTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const payBill = async (req: any, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    if (req.user?.role === 'ADMIN') {
      const err: CustomError = new Error('Administrative accounts are not permitted to make utility bill payments');
      err.statusCode = 403;
      client.release();
      return next(err);
    }

    const validatedData = payBillSchema.parse(req.body);
    const { type, billerId, amount, upiPin } = validatedData;
    const userId = req.user.id;

    // Start transaction
    await client.query('BEGIN');

    // Lock wallet row
    const walletRes = await client.query(
      'SELECT id, balance, upi_pin, upi_id FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (walletRes.rowCount === 0) {
      const err: CustomError = new Error('Wallet not found');
      err.statusCode = 404;
      await client.query('ROLLBACK');
      client.release();
      return next(err);
    }

    const wallet = walletRes.rows[0];

    // Check UPI PIN
    const isPinValid = await comparePassword(upiPin, wallet.upi_pin);
    if (!isPinValid) {
      const err: CustomError = new Error('Invalid UPI PIN');
      err.statusCode = 400;
      await client.query('ROLLBACK');
      client.release();
      return next(err);
    }

    // Check balance
    const balance = parseFloat(wallet.balance);
    if (balance < amount) {
      const err: CustomError = new Error('Insufficient wallet balance to pay bill');
      err.statusCode = 400;
      await client.query('ROLLBACK');
      client.release();
      return next(err);
    }

    const newBalance = balance - amount;

    // Update wallet
    await client.query(
      'UPDATE wallets SET balance = $1 WHERE user_id = $2',
      [newBalance, userId]
    );

    // Encrypt details
    const metadata = JSON.stringify({
      billerId,
      billCategory: type,
      operatorName: `Provider simulation: ${type}`,
    });
    const encryptedMetadata = encrypt(metadata);

    // Save transaction
    await client.query(
      `INSERT INTO transactions (sender_id, receiver_id, amount, type, status, encrypted_metadata)
       VALUES ($1, NULL, $2, 'BILL', 'SUCCESS', $3)`,
      [userId, amount, encryptedMetadata]
    );

    await client.query('COMMIT');
    client.release();

    logger.info(`Successfully paid ${type} bill of ₹${amount} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      message: `${type} Bill of ₹${amount.toFixed(2)} paid successfully to account ${billerId}!`,
      data: {
        newBalance,
      },
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollError) {
      // Ignore rollback errors if transaction was not active
    }
    client.release();
    next(error);
  }
};

export const setUpiPin = async (req: any, res: Response, next: NextFunction) => {
  try {
    const validatedData = setUpiPinSchema.parse(req.body);
    const { upiPin, password } = validatedData;
    const userId = req.user.id;

    // Validate login password to prevent unauthorized PIN modification
    const userRes = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rowCount === 0) {
      const err: CustomError = new Error('User not found');
      err.statusCode = 404;
      return next(err);
    }

    const isPasswordValid = await comparePassword(password, userRes.rows[0].password_hash);
    if (!isPasswordValid) {
      const err: CustomError = new Error('Invalid account password. Authentication failed.');
      err.statusCode = 400;
      return next(err);
    }

    const hashedUpiPin = await hashPassword(upiPin);

    await query(
      'UPDATE wallets SET upi_pin = $1 WHERE user_id = $2',
      [hashedUpiPin, userId]
    );

    // Log security pin update
    await query(
      'INSERT INTO security_logs (user_id, event_type, severity, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'UPI_PIN_CHANGED', 'MEDIUM', JSON.stringify({}), req.ip || 'unknown']
    );

    res.status(200).json({
      status: 'success',
      message: 'UPI PIN set successfully!',
    });
  } catch (error) {
    next(error);
  }
};

export const getRewards = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const rewardsRes = await query(
      'SELECT id, amount, description, claimed, created_at FROM rewards WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const totalCashbackRes = await query(
      'SELECT COALESCE(SUM(amount) FILTER (WHERE claimed = TRUE), 0.00) as total FROM rewards WHERE user_id = $1',
      [userId]
    );

    res.status(200).json({
      status: 'success',
      data: {
        rewards: rewardsRes.rows,
        totalCashback: parseFloat(totalCashbackRes.rows[0].total),
      },
    });
  } catch (error) {
    next(error);
  }
};
