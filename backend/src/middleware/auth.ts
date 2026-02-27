import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { verifyToken, JWTPayload } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const databaseUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        companyId: true,
        role: true,
      },
    });

    if (!databaseUser) {
      return res.status(401).json({ message: 'Account no longer exists' });
    }

    req.user = {
      userId: databaseUser.id,
      email: databaseUser.email,
      companyId: databaseUser.companyId,
      role: databaseUser.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
