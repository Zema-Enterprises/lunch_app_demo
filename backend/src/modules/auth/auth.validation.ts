import { z } from 'zod';
import { PASSWORD_COMPLEXITY_REGEX, PASSWORD_REQUIREMENTS_MESSAGE } from '../../utils/password';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z
      .string()
      .max(100, 'Password must be 100 characters or fewer')
      .regex(PASSWORD_COMPLEXITY_REGEX, PASSWORD_REQUIREMENTS_MESSAGE),
    name: z.string().min(1).max(100),
    companyId: z.string().optional(),
    role: z.enum(['ADMIN', 'USER']).optional(),
    companyName: z.string().min(1).max(100).optional(),
    companyDomain: z.string().min(1).max(100).optional(),
    companySlug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().max(100),
  }),
});
