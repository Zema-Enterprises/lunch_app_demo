/**
 * Notification Service - Phase 4
 * 
 * Handles notification event creation and user preference checking.
 * Does NOT handle actual email/in-app delivery (that's Phase 5).
 */

import prisma from '../../config/database';
import { broadcastNotificationCreated } from '../../realtime/notifications.dispatcher';
import { NotificationType } from '@prisma/client';
import { dispatchPushNotification } from './push.service';

export interface CreateNotificationOptions {
  type: NotificationType;
  userId: string;
  eventId?: string;
  orderId?: string;
}

/**
 * Get user's notification settings (or create default if not exists)
 */
export async function getUserNotificationSettings(userId: string) {
  let settings = await prisma.userNotificationSettings.findUnique({
    where: { userId },
  });

  // Create default settings if user doesn't have any
  if (!settings) {
    settings = await prisma.userNotificationSettings.create({
      data: {
        userId,
        emailEnabled: true,
        inAppEnabled: true,
        notifyOnEventCreated: false,
        notifyOnOrderPlaced: true,
        notifyOnDeadlineApproaching: true,
        notifyOnEventClosed: true,
        notifyOnPaymentConfirmed: true,
        notifyOnEventCompleted: true,
      },
    });
  }

  return settings;
}

/**
 * Check if user should be notified for a given notification type
 */
export async function shouldNotifyUser(
  userId: string,
  type: NotificationType
): Promise<boolean> {
  const settings = await getUserNotificationSettings(userId);

  // If both channels disabled, don't notify
  if (!settings.emailEnabled && !settings.inAppEnabled) {
    return false;
  }

  // Check type-specific settings
  switch (type) {
    case 'EVENT_CREATED':
      return settings.notifyOnEventCreated;
    case 'ORDER_PLACED':
    case 'ORDER_UPDATED':
      return settings.notifyOnOrderPlaced;
    case 'EVENT_CLOSING_SOON':
      return settings.notifyOnDeadlineApproaching;
    case 'EVENT_CLOSED':
      return settings.notifyOnEventClosed;
    case 'PAYMENT_CONFIRMED':
      return settings.notifyOnPaymentConfirmed;
    case 'EVENT_COMPLETED':
    case 'EVENT_DELIVERED':
      return settings.notifyOnEventCompleted;
    case 'USER_JOINED_EVENT':
      return true; // Always notify event creator when someone joins
    default:
      return true; // Default to notify for unknown types
  }
}

/**
 * Create a notification event (will be sent later in Phase 5)
 */
export async function createNotificationEvent(
  options: CreateNotificationOptions
) {
  const { type, userId, eventId, orderId } = options;

  // Check if user wants this notification
  const shouldNotify = await shouldNotifyUser(userId, type);
  if (!shouldNotify) {
    return null; // User has disabled this notification type
  }

  // Create notification event record
  const notification = await prisma.notificationEvent.create({
    data: {
      type,
      userId,
      eventId,
      orderId,
      read: false,
      sentEmail: false,
      sentInApp: false,
    },
    include: {
      user: true,
      event: true,
      order: true,
    },
  });

  broadcastNotificationCreated(notification);
  await dispatchPushNotification(notification);

  return notification;
}

/**
 * Create notification events for multiple users
 */
export async function createNotificationEvents(
  type: NotificationType,
  userIds: string[],
  options?: { eventId?: string; orderId?: string }
) {
  const notifications = [];

  for (const userId of userIds) {
    const notification = await createNotificationEvent({
      type,
      userId,
      eventId: options?.eventId,
      orderId: options?.orderId,
    });

    if (notification) {
      notifications.push(notification);
    }
  }

  return notifications;
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string) {
  const notifications = await prisma.notificationEvent.findMany({
    where: {
      userId,
      read: false,
    },
    include: {
      event: true,
      order: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return notifications;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const notification = await prisma.notificationEvent.update({
    where: { id: notificationId },
    data: { read: true },
  });

  return notification;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  const result = await prisma.notificationEvent.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });

  return result;
}

/**
 * Get notification count for a user
 */
export async function getUnreadNotificationCount(userId: string) {
  const count = await prisma.notificationEvent.count({
    where: {
      userId,
      read: false,
    },
  });

  return count;
}

/**
 * Delete old read notifications (cleanup utility for Phase 5 cron job)
 */
export async function deleteOldReadNotifications(daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.notificationEvent.deleteMany({
    where: {
      read: true,
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return result;
}
