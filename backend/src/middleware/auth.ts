import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role?: 'user' | 'admin';
  };
}

interface JwtPayload {
  id: string;
  username: string;
  email: string;
  role?: 'user' | 'admin';
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: 'Authorization header is missing' });
    return;
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({ message: 'Token is missing' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_prompt_golf_token_key_12345') as JwtPayload;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || 'user'
    };
    next();
  } catch (error) {
    res.status(403).json({ message: 'Token is invalid or expired' });
    return;
  }
};

// Admin authentication middleware
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
};
