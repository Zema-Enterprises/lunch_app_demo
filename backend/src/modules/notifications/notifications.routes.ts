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
  getPushSubscriptions,
  registerPushSubscription,
  deletePushSubscription,
} from './push.controller';
import { getNotificationAnalyticsSummary } from './analytics.controller';
import { validate } from '../../middleware/validation';
import {
  registerPushSubscriptionSchema,
  deletePushSubscriptionSchema,
  updateNotificationSettingsSchema,
} from './notifications.validation';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Notification endpoints
router.get('/', getNotifications);
router.get('/stats', getNotificationStats);
router.patch('/:id/read', markNotificationAsRead);
router.post('/mark-all-read', markAllNotificationsAsRead);
router.get('/push/public-key', getPushPublicKey);
router.get('/push-subscriptions', getPushSubscriptions);
router.post('/push-subscriptions', validate(registerPushSubscriptionSchema), registerPushSubscription);
router.delete('/push-subscriptions', validate(deletePushSubscriptionSchema), deletePushSubscription);
router.get('/analytics/summary', getNotificationAnalyticsSummary);

// Notification settings endpoints
router.get('/settings', getNotificationSettings);
router.put('/settings', validate(updateNotificationSettingsSchema), updateNotificationSettings);

export default router;
