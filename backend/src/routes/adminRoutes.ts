import { Router } from 'express';
import {
  getDashboardStats,
  getAllUsers,
  toggleUserBlock,
  getSecurityLogs,
} from '../controllers/adminController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.post('/users/:userId/block', toggleUserBlock);
router.get('/logs', getSecurityLogs);

export default router;
