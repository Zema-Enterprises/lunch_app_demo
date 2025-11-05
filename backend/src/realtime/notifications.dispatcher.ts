import { NotificationEvent, Event, Order, User } from '@prisma/client';
import { emitRealtimeNotification } from './notifications.registry';
import { NOTIFICATION_CREATED_EVENT } from './constants';

type NotificationRelations = {
  user?: Pick<User, 'id' | 'companyId' | 'name' | 'email'> | null;
  event?: Pick<Event, 'id' | 'title' | 'companyId' | 'restaurantId'> | null;
  order?: Pick<Order, 'id' | 'totalAmount' | 'paymentConfirmed' | 'customOrder'> | null;
};

type NotificationWithRelations = NotificationEvent & NotificationRelations;

const buildBroadcastPayload = (notification: NotificationWithRelations) => {
  const base = {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    eventId: notification.eventId ?? undefined,
    orderId: notification.orderId ?? undefined,
    read: notification.read,
    sentEmail: notification.sentEmail,
    sentInApp: notification.sentInApp,
    createdAt:
      notification.createdAt instanceof Date
        ? notification.createdAt.toISOString()
        : notification.createdAt,
  };

  const meta: Record<string, unknown> = {};

  if (notification.event) {
    meta.event = {
      id: notification.event.id,
      title: notification.event.title,
      restaurantId: notification.event.restaurantId,
    };
  }

  if (notification.order) {
    meta.order = {
      id: notification.order.id,
      totalAmount: notification.order.totalAmount,
      paymentConfirmed: notification.order.paymentConfirmed,
      customOrder: notification.order.customOrder,
    };
  }

  return {
    ...base,
    ...meta,
  };
};

export const broadcastNotificationCreated = (notification: NotificationWithRelations) => {
  const companyId = notification.user?.companyId;
  if (!companyId) {
    console.log('[Socket.IO] No companyId for notification:', notification.id);
    return;
  }

  const payload = buildBroadcastPayload(notification);

  console.log('[Socket.IO] Emitting notification:', {
    notificationId: notification.id,
    type: notification.type,
    userId: notification.userId,
    companyId,
    event: NOTIFICATION_CREATED_EVENT,
  });

  emitRealtimeNotification(companyId, { companyId, ...payload }, {
    userId: notification.userId,
    event: NOTIFICATION_CREATED_EVENT,
  });
};
