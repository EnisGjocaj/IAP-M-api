import express from 'express';

import { authenticateStudent } from '../../apps/middleware/studentAuthMiddleware';
import { aiService } from '../core/ai.container';

const advisorRouter = express.Router();

advisorRouter.post('/plan', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { prompt } = req.body as { prompt?: string };
    const result = await aiService.advise(userId, { prompt: prompt || '' });
    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default advisorRouter;
