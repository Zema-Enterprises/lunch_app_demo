import { Router } from 'express';
import { register, login, getCurrentUser, logout, refreshAccessToken } from './auth.controller';
import { validate } from '../../middleware/validation';
import { registerSchema, loginSchema } from './auth.validation';
import { authMiddleware } from '../../middleware/auth';
import { redeemInvite } from '../invites/invites.controller';
import { redeemInviteSchema } from '../invites/invites.validation';
import { resolveCompanyFromSlug } from '../../middleware/company';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authMiddleware, getCurrentUser);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);
router.post('/invites/redeem', validate(redeemInviteSchema), redeemInvite);
router.post(
  '/invites/:slug/redeem',
  resolveCompanyFromSlug,
  validate(redeemInviteSchema),
  redeemInvite
);

export default router;
