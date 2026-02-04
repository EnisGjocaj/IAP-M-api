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
      conversationId?: number;
      saveConversation?: boolean;
    };

    const result = await aiService.generateExam(userId, {
      materialIds: materialIds || [],
      count,
      conversationId: (req.body as any)?.conversationId,
      saveConversation: Boolean((req.body as any)?.saveConversation),
    });
    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default examEngineRouter;
