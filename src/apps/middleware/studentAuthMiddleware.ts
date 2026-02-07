import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticateStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
      role: string;
      isStudent: boolean;
    };

    if (!decoded.isStudent) {
      return res.status(403).json({ message: 'Access denied. Students only.' });
    }

    (req as any).user = decoded;

    const url = req.originalUrl || req.url || '';
    if (typeof url === 'string' && url.includes('/api/ai/settings/status')) {
      return next();
    }

    const settings = await (prisma as any).aiSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, requireApproval: true, aiEnabled: true },
      select: { aiEnabled: true },
    });

    if (!settings?.aiEnabled) {
      return res.status(403).json({
        message: 'AI_DISABLED',
        uiMessage: 'Shërbimi AI është përkohësisht i çaktivizuar.',
      });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
