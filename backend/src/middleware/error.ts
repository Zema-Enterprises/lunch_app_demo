import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred:', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      details: err.errors,
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  return res.status(500).json({
    message: 'Internal server error',
  });
};
