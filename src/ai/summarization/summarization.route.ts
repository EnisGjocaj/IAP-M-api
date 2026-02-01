import express from 'express';

import { authenticateStudent } from '../../apps/middleware/studentAuthMiddleware';
import { aiService } from '../core/ai.container';

const summarizationRouter = express.Router();

summarizationRouter.post('/', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { materialIds, style } = req.body as {
      materialIds?: number[];
      style?: 'bullet' | 'short' | 'detailed';
    };

    const result = await aiService.summarize(userId, { materialIds: materialIds || [], style });
    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default summarizationRouter;
