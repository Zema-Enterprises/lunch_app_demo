/**
 * Notification Service - Phase 4
 * 
 * Handles notification event creation and user preference checking.
 * Does NOT handle actual email/in-app delivery (that's Phase 5).
 */

import prisma from '../../config/database';
import { broadcastNotificationCreated } from '../../realtime/notifications.dispatcher';
import { NotificationType, Event, Order, User, Prisma } from '@prisma/client';
import { dispatchPushNotification } from './push.service';

export interface CreateNotificationOptions {
  type: NotificationType;
  userId: string;
  eventId?: string;
  orderId?: string;
  actorId?: string;
  context?: NotificationContext;
}

type NotificationContext = {
  event?: (Event & { restaurant?: { name: string | null } | null }) | null;
  order?: Order | null;
  actor?: Pick<User, 'id' | 'name'> | null;
};

type NotificationCopy = {
  category: string;
  title: string;
  body: string;
  cta?: { kind: string; id?: string };
  subject?: { eventId?: string; eventTitle?: string; restaurantName?: string | null };
  meta?: Record<string, unknown>;
};

const CATEGORY_BY_TYPE: Record<NotificationType, string> = {
  EVENT_CREATED: 'event_lifecycle',
  USER_JOINED_EVENT: 'participant_activity',
  USER_LEFT_EVENT: 'participant_activity',
  ORDER_PLACED: 'order_payment',
  ORDER_UPDATED: 'order_payment',
  EVENT_CLOSING_SOON: 'reminder',
  EVENT_CLOSED: 'event_lifecycle',
  PAYMENT_CONFIRMED: 'order_payment',
  EVENT_COMPLETED: 'event_lifecycle',
  EVENT_DELIVERED: 'event_lifecycle',
};

const buildCopy = (
  type: NotificationType,
  context: NotificationContext,
  ids: { eventId?: string; orderId?: string }
): NotificationCopy => {
  const actorName = context.actor?.name || 'Someone';
  const eventTitle = context.event?.title || 'this event';
  const restaurantName = context.event?.restaurant?.name;
  const subject: NotificationCopy['subject'] = ids.eventId
    ? {
        eventId: ids.eventId,
        eventTitle,
        restaurantName,
      }
    : undefined;

  const meta: Record<string, unknown> = {};
  if (subject) meta.subject = subject;
  if (context.actor) meta.actor = { id: context.actor.id, name: context.actor.name };
  if (context.order) {
    meta.order = {
      id: context.order.id,
      totalAmount: context.order.totalAmount,
      paymentConfirmed: context.order.paymentConfirmed,
      customOrder: context.order.customOrder,
    };
  }

  const cta: NotificationCopy['cta'] = ids.eventId
    ? { kind: 'event', id: ids.eventId }
    : ids.orderId
    ? { kind: 'order', id: ids.orderId }
    : { kind: 'notifications' };

  switch (type) {
    case 'EVENT_CREATED':
      return {
        category: CATEGORY_BY_TYPE[type],
        title: `${actorName} created ${eventTitle}`,
        body: restaurantName
          ? `${actorName} created ${eventTitle} at ${restaurantName}`
          : `${actorName} created ${eventTitle}`,
        cta,
        subject,
        meta,
      };
    case 'USER_JOINED_EVENT':
      return {
        category: CATEGORY_BY_TYPE[type],
        title: `${actorName} joined ${eventTitle}`,
        body: restaurantName
          ? `${actorName} joined ${eventTitle} at ${restaurantName}`
          : `${actorName} joined ${eventTitle}`,
        cta,
        subject,
        meta,
      };
    case 'USER_LEFT_EVENT':
      return {
        category: CATEGORY_BY_TYPE[type],
        title: `${actorName} left ${eventTitle}`,
        body: `${actorName} left ${eventTitle}`,
        cta,
        subject,
        meta,
      };
    case 'EVENT_CLOSED':
      return {
        category: CATEGORY_BY_TYPE[type],
        title: `${eventTitle} is closed`,
        body: `Ordering is now closed for ${eventTitle}`,
        cta,
        subject,
        meta,
      };
    case 'EVENT_DELIVERED':
      return {
        category: CATEGORY_BY_TYPE[type],
        title: `${eventTitle} is on its way`,
        body: `${eventTitle} is out for delivery${restaurantName ? ` from ${restaurantName}` : ''}`,
        cta,
        subject,
        meta,
      };
    case 'EVENT_COMPLETED':
      return {
        category: CATEGORY_BY_TYPE[type],
        title: `${eventTitle} marked completed`,
        body: `${eventTitle} has been marked as completed`,
        cta,
        subject,
        meta,
      };
    case 'ORDER_PLACED':
      return {
        category: CATEGORY_BY_TYPE[type],
        title: `${actorName} placed an order`,
        body: `${actorName} placed an order for ${eventTitle}`,
        cta,
        subject,
        meta,
      };
    case 'ORDER_UPDATED':
      return {
        category: CATEGORY_BY_TYPE[type],
        title: `${actorName} updated their order`,
        body: `${actorName} updated their order for ${eventTitle}`,
        cta,
        subject,
        meta,
      };
    case 'EVENT_CLOSING_SOON':
      return {
        category: CATEGORY_BY_TYPE[type],
        title: `${eventTitle} closing soon`,
        body: `${eventTitle} is closing soon. Place your order.`,
        cta,
        subject,
        meta,
      };
    case 'PAYMENT_CONFIRMED':
      return {
        category: CATEGORY_BY_TYPE[type],
        title: `Payment confirmed for ${eventTitle}`,
        body: `${actorName} confirmed payment for ${eventTitle}`,
        cta,
        subject,
        meta,
      };
    default:
      return {
        category: 'general',
        title: 'Notification',
        body: `${eventTitle}`,
        cta,
        subject,
        meta,
      };
  }
};

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
        notifyOnEventCreated: true, // Users should know about new events
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
    case 'USER_LEFT_EVENT':
      return true; // Always notify event creator when someone joins/leaves
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
  const { type, userId, eventId, orderId, actorId, context = {} } = options;

  // Check if user wants this notification
  const shouldNotify = await shouldNotifyUser(userId, type);
  if (!shouldNotify) {
    return null; // User has disabled this notification type
  }

  const event =
    context.event ??
    (eventId
      ? await prisma.event.findUnique({
          where: { id: eventId },
          include: { restaurant: true },
        })
      : null);

  const order = context.order ?? (orderId ? await prisma.order.findUnique({ where: { id: orderId } }) : null);

  const actor =
    context.actor ??
    (actorId
      ? await prisma.user.findUnique({
          where: { id: actorId },
          select: { id: true, name: true },
        })
      : null);

  const copy = buildCopy(type, { actor, event, order }, { eventId, orderId });

  // Create notification event record
  const notification = await prisma.notificationEvent.create({
    data: {
      type,
      userId,
      eventId,
      orderId,
      actorId: actor?.id ?? actorId,
      read: false,
      sentEmail: false,
      sentInApp: false,
      category: copy.category,
      title: copy.title,
      body: copy.body,
      meta: copy.meta as Prisma.InputJsonValue | undefined,
      ctaKind: copy.cta?.kind,
      ctaId: copy.cta?.id,
    },
    include: {
      user: true,
      actor: true,
      event: {
        include: {
          restaurant: true,
        },
      },
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
  options?: { eventId?: string; orderId?: string; actorId?: string; context?: NotificationContext }
) {
  const notifications = [];

  for (const userId of userIds) {
    const notification = await createNotificationEvent({
      type,
      userId,
      eventId: options?.eventId,
      orderId: options?.orderId,
      actorId: options?.actorId,
      context: options?.context,
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
      event: {
        include: { restaurant: true },
      },
      order: true,
      actor: true,
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
