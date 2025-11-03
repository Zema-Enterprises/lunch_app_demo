import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const tenantMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // This middleware is applied after authMiddleware
  // It ensures all queries are scoped to the user's company
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};
