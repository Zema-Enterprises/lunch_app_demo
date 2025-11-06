import { z } from 'zod';
import { PASSWORD_COMPLEXITY_REGEX, PASSWORD_REQUIREMENTS_MESSAGE } from '../../utils/password';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .max(100, 'Password must be 100 characters or fewer')
      .regex(PASSWORD_COMPLEXITY_REGEX, PASSWORD_REQUIREMENTS_MESSAGE),
  }),
});

export const updateCompanySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Company name must be at least 2 characters'),
    domain: z.string().min(2, 'Domain must be at least 2 characters'),
  }),
});
