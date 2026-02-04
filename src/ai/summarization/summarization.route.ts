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

    const { materialIds, style, conversationId, saveConversation } = req.body as {
      materialIds?: number[];
      style?: 'bullet' | 'short' | 'detailed';
      conversationId?: number;
      saveConversation?: boolean;
    };

    const result = await aiService.summarize(userId, {
      materialIds: materialIds || [],
      style,
      conversationId,
      saveConversation: Boolean(saveConversation),
    });
    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default summarizationRouter;
