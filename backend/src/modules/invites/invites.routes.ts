import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { createInviteSchema } from './invites.validation';
import { createInvite, listInvites } from './invites.controller';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', listInvites);
router.post('/', validate(createInviteSchema), createInvite);

export default router;
