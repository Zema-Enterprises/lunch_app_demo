import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format validation errors into a user-friendly message
        const firstError = error.errors[0];
        let message = 'Validation error';
        
        if (firstError) {
          const field = firstError.path[firstError.path.length - 1];
          message = `${field} ${firstError.message}`.toLowerCase();
        }
        
        return res.status(400).json({
          message,
          errors: error.errors,
        });
      }
      next(error);
    }
  };
