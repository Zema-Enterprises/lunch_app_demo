import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  getNotifications,
  getNotificationStats,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationSettings,
  updateNotificationSettings,
} from './notifications.controller';
import {
  getPushPublicKey,
  registerPushSubscription,
  deletePushSubscription,
} from './push.controller';
import { getNotificationAnalyticsSummary } from './analytics.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Notification endpoints
router.get('/', getNotifications);
router.get('/stats', getNotificationStats);
router.patch('/:id/read', markNotificationAsRead);
router.post('/mark-all-read', markAllNotificationsAsRead);
router.get('/push/public-key', getPushPublicKey);
router.post('/push-subscriptions', registerPushSubscription);
router.delete('/push-subscriptions', deletePushSubscription);
router.get('/analytics/summary', getNotificationAnalyticsSummary);

// Notification settings endpoints
router.get('/settings', getNotificationSettings);
router.put('/settings', updateNotificationSettings);

export default router;
