import express from 'express';

import { authenticateStudent } from '../../apps/middleware/studentAuthMiddleware';
import { aiService } from '../core/ai.container';

const examEngineRouter = express.Router();

examEngineRouter.post('/generate', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { materialIds, count } = req.body as {
      materialIds?: number[];
      count?: number;
    };

    const result = await aiService.generateExam(userId, { materialIds: materialIds || [], count });
    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default examEngineRouter;
