import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { createNotificationsSocket } from './socket-client';
import { resolveNotificationsSocketUrl } from './config';
import { GATEWAY_HANDSHAKE_EVENT, NOTIFICATION_CREATED_EVENT } from './constants';
import { handshakeSchema } from './handshake';
import { notificationEventSchema } from '../validation/schemas';
import { useAuthStore } from '@/store/authStore';
import { useNotificationsRealtimeStore, DEFAULT_FALLBACK_MS } from '@/store/notificationsRealtimeStore';
import { useNotificationQueueStore } from '@/store/notificationQueueStore';
import type { NotificationEvent, NotificationStats } from '@/types';

const realtimeNotificationSchema = notificationEventSchema.extend({
  companyId: z.string(),
});

type RealtimeNotification = z.infer<typeof realtimeNotificationSchema>;
type Handshake = z.infer<typeof handshakeSchema>;

const buildNotificationModel = (payload: RealtimeNotification): NotificationEvent => ({
  id: payload.id,
  type: payload.type,
  userId: payload.userId,
  eventId: payload.eventId,
  orderId: payload.orderId,
  read: payload.read ?? false,
  sentEmail: payload.sentEmail ?? false,
  sentInApp: payload.sentInApp ?? false,
  createdAt: payload.createdAt,
  event: undefined,
  order: undefined,
  user: undefined,
});

const deriveLimit = (segment?: unknown) => {
  if (typeof segment !== 'string') return undefined;
  if (!segment.startsWith('limit:')) return undefined;
  const value = Number.parseInt(segment.slice(6), 10);
  return Number.isNaN(value) ? undefined : value;
};

export const useNotificationsRealtime = () => {
  const { user, token, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const setConnecting = useNotificationsRealtimeStore((state) => state.setConnecting);
  const applyHandshake = useNotificationsRealtimeStore((state) => state.applyHandshake);
  const enforceFallback = useNotificationsRealtimeStore((state) => state.enforceFallback);
  const resetRealtimeState = useNotificationsRealtimeStore((state) => state.reset);
  const enqueueNotificationId = useNotificationQueueStore((state) => state.enqueue);
  const flushQueuedNotificationIds = useNotificationQueueStore((state) => state.flush);
  const clearNotificationQueue = useNotificationQueueStore((state) => state.clear);

  useEffect(() => {
    if (!isAuthenticated || !user || !token) {
      resetRealtimeState();
      clearNotificationQueue();
      return;
    }

    setConnecting();

    const invalidateNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'stats'] });
    };

    const flushQueuedNotifications = () => {
      const queuedIds = flushQueuedNotificationIds();
      if (!queuedIds.length) {
        return;
      }
      invalidateNotifications();
    };

    const socketUrl = resolveNotificationsSocketUrl();
    let socketIoClient: Socket | null = null;

    const connectionFactory = () => {
      socketIoClient = io(socketUrl, {
        transports: ['websocket'],
        auth: { token: `Bearer ${token}` },
        autoConnect: true,
      });

      socketIoClient.on('connect_error', () => {
        enforceFallback();
      });

      socketIoClient.on('disconnect', () => {
        enforceFallback();
      });

      return {
        handshake: undefined,
        on: (event: string, handler: (...args: any[]) => void) => {
          socketIoClient?.on(event, handler);
        },
        close: () => {
          if (!socketIoClient) return;
          socketIoClient.off(GATEWAY_HANDSHAKE_EVENT);
          socketIoClient.off(NOTIFICATION_CREATED_EVENT);
          socketIoClient.off('connect_error');
          socketIoClient.off('disconnect');
          socketIoClient.disconnect();
        },
      };
    };

    const handleHandshake = (handshake: Handshake) => {
      applyHandshake(handshake);
      if (!handshake.featureFlags.notificationsRealtime) {
        enforceFallback(handshake.fallbackPollingMs ?? DEFAULT_FALLBACK_MS);
      }
    };

    const handleNotification = (payload: unknown) => {
      const parsed = realtimeNotificationSchema.safeParse(payload);
      if (!parsed.success) {
        return;
      }
      const notification = parsed.data;
      if (notification.userId !== user.id) return;

      const model = buildNotificationModel(notification);

      const queries = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['notifications'] });

      queries.forEach((query) => {
        queryClient.setQueryData(query.queryKey, (existing: unknown) => {
          if (!Array.isArray(existing)) return existing;

          const [, scopeSegment, limitSegment] = query.queryKey as [string, string?, string?];

          if (scopeSegment === 'unread' && model.read) {
            return existing;
          }

          const limit = deriveLimit(limitSegment);
          const deduped = existing.filter((item) => item.id !== model.id);
          const updated = [model, ...deduped];

          if (typeof limit === 'number') {
            return updated.slice(0, limit);
          }

          return updated;
        });
      });

      queryClient.setQueryData<NotificationStats | undefined>(['notifications', 'stats'], (stats) => {
        if (!stats) return stats;
        return {
          total: stats.total + 1,
          unread: model.read ? stats.unread : stats.unread + 1,
        };
      });
    };

    const client = createNotificationsSocket({
      user: { id: user.id, companyId: user.companyId },
      connectionFactory,
      onNotification: handleNotification,
      onHandshake: (payload) => {
        const parsed = handshakeSchema.safeParse(payload);
        if (!parsed.success) {
          enforceFallback();
          return;
        }
        handleHandshake(parsed.data);
      },
    });

    const initialHandshake = client.handshake;
    if (initialHandshake) {
      handleHandshake(initialHandshake);
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const message = event?.data;
      if (!message || message.type !== 'PUSH_NOTIFICATION_RECEIVED') {
        return;
      }

      const notificationId: string | undefined = message?.payload?.notificationId;
      if (!notificationId) {
        return;
      }

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        enqueueNotificationId(notificationId);
        return;
      }

      invalidateNotifications();
    };

    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.addEventListener) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') {
        return;
      }

      flushQueuedNotifications();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      if (document.visibilityState === 'visible') {
        flushQueuedNotifications();
      }
    }

    return () => {
      client.disconnect();
      resetRealtimeState();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof navigator !== 'undefined' && navigator.serviceWorker?.removeEventListener) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      clearNotificationQueue();
    };
  }, [
    applyHandshake,
    clearNotificationQueue,
    enqueueNotificationId,
    enforceFallback,
    flushQueuedNotificationIds,
    isAuthenticated,
    queryClient,
    resetRealtimeState,
    setConnecting,
    token,
    user,
  ]);
};
