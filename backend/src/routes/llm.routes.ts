import { Router } from 'express';
import { chatCompletion } from '../controllers/llm.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/chat', authenticateToken, chatCompletion);

export default router;
