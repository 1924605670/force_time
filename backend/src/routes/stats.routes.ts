import { Router } from 'express';
import { getUsageStats } from '../controllers/stats.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/summary', authenticateToken, getUsageStats);

export default router;
