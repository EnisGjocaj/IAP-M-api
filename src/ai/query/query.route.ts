import express from 'express';

import { authenticateStudent } from '../../apps/middleware/studentAuthMiddleware';
import { aiService } from '../core/ai.container';

const queryRouter = express.Router();

queryRouter.post('/', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { question, materialIds } = req.body as {
      question?: string;
      materialIds?: number[];
    };

    const result = await aiService.answerQuestion(userId, {
      question: question || '',
      materialIds: materialIds || [],
    });
    return res.status(result.statusCode).json(result.message);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

queryRouter.post('/stream', authenticateStudent, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { question, materialIds } = req.body as {
      question?: string;
      materialIds?: number[];
    };

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    (res as any).flushHeaders?.();

    for await (const token of aiService.streamAnswerQuestion(userId, {
      question: question || '',
      materialIds: materialIds || [],
    })) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    res.write(`event: end\ndata: {}\n\n`);
    res.end();
  } catch (error: any) {
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`);
      res.end();
    } catch {
      // ignore
    }
  }
});

export default queryRouter;
