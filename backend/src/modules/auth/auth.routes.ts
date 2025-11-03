import { Router } from 'express';
import { register, login, getCurrentUser, logout } from './auth.controller';
import { validate } from '../../middleware/validation';
import { registerSchema, loginSchema } from './auth.validation';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authMiddleware, getCurrentUser);
router.post('/logout', logout);

export default router;
