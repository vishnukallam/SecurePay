import { Router } from 'express';
import {
  getWalletInfo,
  addMoney,
  transferMoney,
  getTransactionHistory,
  payBill,
  setUpiPin,
  getRewards,
} from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/wallet/balance', authenticateToken, getWalletInfo);
router.post('/wallet/add', authenticateToken, addMoney);
router.post('/transfer', authenticateToken, transferMoney);
router.get('/history', authenticateToken, getTransactionHistory);
router.post('/pay-bill', authenticateToken, payBill);
router.post('/set-upi-pin', authenticateToken, setUpiPin);
router.get('/rewards', authenticateToken, getRewards);

export default router;
