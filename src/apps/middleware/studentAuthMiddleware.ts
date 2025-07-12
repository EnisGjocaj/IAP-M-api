import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateStudent = (req: Request, res: Response, next: NextFunction) => {
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
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
