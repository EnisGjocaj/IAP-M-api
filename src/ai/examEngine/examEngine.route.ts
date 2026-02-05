import express from 'express';

import { authenticateStudent } from '../../apps/middleware/studentAuthMiddleware';
import { aiService } from '../core/ai.container';
import { GroqJsonError } from '../providers/groq/groq.provider';

const examEngineRouter = express.Router();

examEngineRouter.post('/generate', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { materialIds, count, difficulty, examType } = req.body as {
      materialIds?: number[];
      count?: number;
      difficulty?: 'easy' | 'medium' | 'hard' | string;
      examType?: string;
      conversationId?: number;
      saveConversation?: boolean;
    };

    const result = await aiService.generateExam(userId, {
      materialIds: materialIds || [],
      count,
      difficulty,
      examType,
      conversationId: (req.body as any)?.conversationId,
      saveConversation: Boolean((req.body as any)?.saveConversation),
    });
    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
      console.error('EXAM ROUTE ERROR ==================');
      console.error(error);
      console.error(error?.stack);

      if (error instanceof GroqJsonError && error.code === 'TRUNCATED') {
        return res.status(500).json({
          message: 'Exam generation failed',
          error: error?.message,
          errorCode: 'AI_TRUNCATED',
        });
      }

      return res.status(500).json({
        message: 'Exam generation failed',
        error: error?.message,
      });
    }

});

export default examEngineRouter;
