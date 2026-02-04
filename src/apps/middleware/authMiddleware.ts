import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const debugAuth = process.env.DEBUG_AUTH === 'true';
  if (debugAuth) {
    // eslint-disable-next-line no-console
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
  }
  const token = req.headers.authorization?.split(' ')[1]; 
  if (debugAuth) {
    // eslint-disable-next-line no-console
    console.log('Auth Header:', req.headers.authorization);
    // eslint-disable-next-line no-console
    console.log('Token:', token);
  }

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
      if (err) {
        if (debugAuth) {
          // eslint-disable-next-line no-console
          console.log('JWT Verification Error:', err);
        }
        return res.status(403).json({ 
          message: 'Token verification failed',
          error: err.message 
        });
      }
      if (debugAuth) {
        // eslint-disable-next-line no-console
        console.log('Verified User:', user);
      }
      req.user = user as { userId: number; role: string }; 
      next();
    });
  } else {
    res.status(401).json({ message: 'No token provided' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};