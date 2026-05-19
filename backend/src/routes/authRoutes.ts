import { Router } from 'express';
import { signup, login, verifyMfa, refreshToken, logout, getMe, changePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { strictAuthLimiter } from '../middleware/security';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', strictAuthLimiter, login);
router.post('/verify-mfa', strictAuthLimiter, verifyMfa);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Protected routes
router.get('/me', authenticateToken, getMe);
router.post('/change-password', authenticateToken, changePassword);

export default router;
