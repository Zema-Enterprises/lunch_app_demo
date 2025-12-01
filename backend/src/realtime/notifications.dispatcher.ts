import { NotificationEvent, Event, Order, User } from '@prisma/client';
import { emitRealtimeNotification } from './notifications.registry';
import { NOTIFICATION_CREATED_EVENT } from './constants';

type NotificationRelations = {
  user?: Pick<User, 'id' | 'companyId' | 'name' | 'email'> | null;
  actor?: Pick<User, 'id' | 'name'> | null;
  event?: (Pick<Event, 'id' | 'title' | 'companyId' | 'restaurantId'> & {
    restaurant?: { name: string | null } | null;
  }) | null;
  order?: Pick<Order, 'id' | 'totalAmount' | 'paymentConfirmed' | 'customOrder'> | null;
};

type NotificationWithRelations = NotificationEvent & NotificationRelations;

const resolveSubject = (notification: NotificationWithRelations) => {
  const meta = (notification.meta as Record<string, any> | null) || {};
  if (meta.subject) return meta.subject;
  if (notification.event) {
    return {
      eventId: notification.event.id,
      eventTitle: notification.event.title,
      restaurantName: notification.event.restaurant?.name,
    };
  }
  return undefined;
};

const buildBroadcastPayload = (notification: NotificationWithRelations) => {
  const base = {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    category: notification.category,
    title: notification.title,
    body: notification.body,
    eventId: notification.eventId ?? undefined,
    orderId: notification.orderId ?? undefined,
    read: notification.read,
    sentEmail: notification.sentEmail,
    sentInApp: notification.sentInApp,
    createdAt:
      notification.createdAt instanceof Date
        ? notification.createdAt.toISOString()
        : notification.createdAt,
    meta: notification.meta ?? undefined,
    cta: notification.ctaKind ? { kind: notification.ctaKind, id: notification.ctaId ?? undefined } : undefined,
  };

  const meta: Record<string, unknown> = {};
  let actor: { id: string; name: string | null | undefined } | undefined;

  if (notification.actor) {
    actor = { id: notification.actor.id, name: notification.actor.name };
  } else if ((notification.meta as any)?.actor) {
    actor = (notification.meta as any).actor;
  }

  if (notification.event) {
    meta.event = {
      id: notification.event.id,
      title: notification.event.title,
      restaurantId: notification.event.restaurantId,
      restaurantName: notification.event.restaurant?.name,
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
    actor,
    subject: resolveSubject(notification),
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
