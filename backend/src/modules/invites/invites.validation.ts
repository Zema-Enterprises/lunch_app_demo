import { z } from 'zod';
import { PASSWORD_COMPLEXITY_REGEX, PASSWORD_REQUIREMENTS_MESSAGE } from '../../utils/password';

const inviteRoleEnum = z.enum(['ADMIN', 'MANAGER', 'USER']);

export const createInviteSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    role: inviteRoleEnum.default('USER'),
    note: z.string().max(500).optional(),
  }),
});

export const redeemInviteSchema = z.object({
  body: z.object({
    token: z.string().min(10, 'token is required'),
    name: z.string().min(1).max(100),
    password: z
      .string()
      .max(100, 'Password must be 100 characters or fewer')
      .regex(PASSWORD_COMPLEXITY_REGEX, PASSWORD_REQUIREMENTS_MESSAGE),
  }),
});
