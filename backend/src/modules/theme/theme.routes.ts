import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, adminMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { updateThemeSchema } from './theme.validation';
import { getCompanyTheme, updateCompanyTheme, uploadThemeCover } from './theme.controller';
import { resolveCompanyFromSlug } from '../../middleware/company';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

router.get('/theme', authMiddleware, getCompanyTheme);
router.put(
  '/admin/theme',
  authMiddleware,
  adminMiddleware,
  validate(updateThemeSchema),
  updateCompanyTheme
);
router.post(
  '/admin/theme/cover',
  authMiddleware,
  adminMiddleware,
  upload.single('cover'),
  uploadThemeCover
);

// Slug-scoped routes
router.get(
  '/c/:slug/theme',
  authMiddleware,
  resolveCompanyFromSlug,
  getCompanyTheme
);

router.put(
  '/c/:slug/admin/theme',
  authMiddleware,
  adminMiddleware,
  resolveCompanyFromSlug,
  validate(updateThemeSchema),
  updateCompanyTheme
);

router.post(
  '/c/:slug/admin/theme/cover',
  authMiddleware,
  adminMiddleware,
  resolveCompanyFromSlug,
  upload.single('cover'),
  uploadThemeCover
);

export default router;
