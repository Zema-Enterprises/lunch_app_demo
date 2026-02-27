import { Router } from 'express';
import {
  getUser,
  updateUser,
  deleteUser,
  createUser,
  listUsers,
  updateUserPassword,
  updateProfile,
  changePassword,
  getCompanyUsers,
  updateCompany,
  getCompany,
  getCompanyStats,
  getUserStats,
} from './users.controller';
import { validate } from '../../middleware/validation';
import {
  updateProfileSchema,
  changePasswordSchema,
  updateCompanySchema,
  createUserSchema,
  updateUserSchema,
  updateUserPasswordSchema,
} from './users.validation';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// User profile routes (define before /:id to avoid conflicts)
router.put('/profile', validate(updateProfileSchema), updateProfile);
router.post('/change-password', validate(changePasswordSchema), changePassword);
router.get('/stats', getUserStats);

// Company routes (define before /:id to avoid conflicts)
router.get('/company', getCompany);
router.put('/company', validate(updateCompanySchema), updateCompany);
router.get('/company/users', getCompanyUsers);
router.get('/company/stats', getCompanyStats);

// User CRUD routes (/:id must come after specific routes)
router.get('/', listUsers);
router.post('/', validate(createUserSchema), createUser);
router.get('/:id', getUser);
router.put('/:id', validate(updateUserSchema), updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/password', validate(updateUserPasswordSchema), updateUserPassword);

export default router;
