import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: string;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
  const token = req.headers.authorization?.split(' ')[1]; 
  console.log('Auth Header:', req.headers.authorization);
  console.log('Token:', token);

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
      if (err) {
        console.log('JWT Verification Error:', err);
        // Return more detailed error
        return res.status(403).json({ 
          message: 'Token verification failed',
          error: err.message 
        });
      }
      console.log('Verified User:', user);
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