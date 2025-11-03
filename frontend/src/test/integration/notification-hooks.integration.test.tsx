import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useNotifications,
  useNotificationStats,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useNotificationAnalytics,
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '@/lib/api/hooks';
import { useNotificationsRealtime } from '@/lib/realtime/useNotificationsRealtime';
import {
  useNotificationsRealtimeStore,
  DEFAULT_FALLBACK_MS,
} from '@/store/notificationsRealtimeStore';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/lib/api/client';
import {
  createMockHandshakeResponse,
  handshakeSchema,
} from '@/lib/realtime/handshake';
import { GATEWAY_HANDSHAKE_EVENT, NOTIFICATION_CREATED_EVENT } from '@/lib/realtime/constants';
import { createMockNotificationSettings } from '@/test/utils/factories';
import type {
  NotificationEvent,
  NotificationStats,
  NotificationAnalyticsSummary,
  UserNotificationSettings,
} from '@/types';
import { useNotificationQueueStore } from '@/store/notificationQueueStore';

vi.mock('socket.io-client', () => {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();

  const addListener = (event: string, handler: (...args: any[]) => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(handler);
  };

  const removeListener = (event: string, handler?: (...args: any[]) => void) => {
    if (!handler) {
      listeners.delete(event);
      return;
    }
    listeners.get(event)?.delete(handler);
  };

  const emitClientEvent = (event: string, ...args: any[]) => {
    listeners.get(event)?.forEach((handler) => handler(...args));
  };

  const socket = {
    on: (event: string, handler: (...args: any[]) => void) => {
      addListener(event, handler);
      return socket;
    },
    off: (event: string, handler?: (...args: any[]) => void) => {
      removeListener(event, handler);
      return socket;
    },
    disconnect: vi.fn(),
    close: vi.fn(),
  };

  return {
    io: vi.fn(() => socket as unknown as import('socket.io-client').Socket),
    emitClientEvent,
    resetClientMock: () => listeners.clear(),
  };
});

type HookResult = {
  all: ReturnType<typeof useNotifications>;
  unread: ReturnType<typeof useNotifications>;
  limited: ReturnType<typeof useNotifications>;
  stats: ReturnType<typeof useNotificationStats>;
  markAsRead: ReturnType<typeof useMarkNotificationAsRead>;
  markAllAsRead: ReturnType<typeof useMarkAllNotificationsAsRead>;
  analytics: ReturnType<typeof useNotificationAnalytics>;
  settings: ReturnType<typeof useNotificationSettings>;
  updateSettings: ReturnType<typeof useUpdateNotificationSettings>;
};

const initialAuthState = useAuthStore.getState();
const originalNavigator = window.navigator;
let serviceWorkerListeners: Array<(event: MessageEvent) => void> = [];

const installServiceWorkerMock = () => {
  serviceWorkerListeners = [];
  const serviceWorkerShim: Partial<ServiceWorkerContainer> = {
    addEventListener: (event: string, handler: EventListenerOrEventListenerObject) => {
      if (event !== 'message') return;
      if (typeof handler === 'function') {
        serviceWorkerListeners.push(handler);
        return;
      }
      if (typeof handler?.handleEvent === 'function') {
        serviceWorkerListeners.push(handler.handleEvent.bind(handler));
      }
    },
    removeEventListener: (event: string, handler: EventListenerOrEventListenerObject) => {
      if (event !== 'message') return;
      serviceWorkerListeners = serviceWorkerListeners.filter((listener) => {
        if (typeof handler === 'function') {
          return listener !== handler;
        }
        if (typeof handler?.handleEvent === 'function') {
          return listener !== handler.handleEvent.bind(handler);
        }
        return true;
      });
    },
  };

  Object.defineProperty(window, 'navigator', {
    configurable: true,
    value: {
      ...originalNavigator,
      serviceWorker: serviceWorkerShim as ServiceWorkerContainer,
    } satisfies Navigator,
  });
};

const restoreServiceWorkerMock = () => {
  Object.defineProperty(window, 'navigator', {
    configurable: true,
    value: originalNavigator,
  });
};

const emitServiceWorkerMessage = (data: any) => {
  const event = new MessageEvent('message', { data });
  serviceWorkerListeners.forEach((listener) => listener(event));
};

const createWrapper = (client: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

const renderNotificationsFeature = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const useCombinedHook = (): HookResult => {
    const all = useNotifications();
    const unread = useNotifications({ unreadOnly: true });
    const limited = useNotifications({ limit: 1 });
    const stats = useNotificationStats();
    const markAsRead = useMarkNotificationAsRead();
    const markAllAsRead = useMarkAllNotificationsAsRead();
    const analytics = useNotificationAnalytics();
    const settings = useNotificationSettings();
    const updateSettings = useUpdateNotificationSettings();
    useNotificationsRealtime();
    return { all, unread, limited, stats, markAsRead, markAllAsRead, analytics, settings, updateSettings };
  };

  return {
    queryClient,
    ...renderHook(useCombinedHook, {
      wrapper: createWrapper(queryClient),
    }),
  };
};

const mockNotificationApi = ({
  notifications,
  stats,
  analytics,
  settings,
}: {
  notifications: NotificationEvent[];
  stats: NotificationStats;
  analytics?: NotificationAnalyticsSummary;
  settings?: UserNotificationSettings;
}) =>
  vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
    if (url === '/notifications/analytics/summary') {
      return {
        data: {
          data:
            analytics ??
            {
              companyId: 'company-123',
              totals: { notifications: stats.total, unread: stats.unread },
              delivery: {},
            },
        },
      };
    }

    if (url === '/notifications/settings') {
      return {
        data: {
          data: settings ?? createMockNotificationSettings({ userId: 'user-test', notifyOnEventCreated: true }),
        },
      };
    }

    if (url === '/notifications/stats') {
      return { data: { data: { ...stats } } };
    }

    if (url.startsWith('/notifications')) {
      const unreadOnly = url.includes('unreadOnly=true');
      const limitMatch = url.match(/limit=(\d+)/);
      let items = notifications
        .filter((item) => (unreadOnly ? !item.read : true))
        .map((item) => ({ ...item }));

      if (limitMatch) {
        const limit = Number.parseInt(limitMatch[1]!, 10);
        if (!Number.isNaN(limit)) {
          items = items.slice(0, limit);
        }
      }

      return { data: { data: items } };
    }

    throw new Error(`Unexpected GET ${url}`);
  });

describe('Notification hooks integration (Phase 5.2)', () => {
  let emitClientEvent: (event: string, payload?: any) => void;
  let resetClientMock: () => void;

  beforeEach(async () => {
    vi.restoreAllMocks();
    installServiceWorkerMock();
    const socketModule: any = await import('socket.io-client');
    emitClientEvent = socketModule.emitClientEvent;
    resetClientMock = socketModule.resetClientMock;
    resetClientMock();
    await act(async () => {
      useNotificationsRealtimeStore.getState().reset();
      useAuthStore.setState({
        ...initialAuthState,
        user: {
          id: 'user-test',
          email: 'user@example.com',
          name: 'Test User',
          role: 'USER',
          companyId: 'company-123',
        },
        token: 'test-token',
        isAuthenticated: true,
        isLoading: false,
      });
    });
  });

  afterEach(async () => {
    await act(async () => {
      useAuthStore.setState(initialAuthState);
      useNotificationsRealtimeStore.getState().reset();
      useNotificationQueueStore.getState().clear();
    });
    restoreServiceWorkerMock();
  });

  test('hydrates cache from websocket push and updates list queries', async () => {
    const notifications: NotificationEvent[] = [
      {
        id: 'existing-1',
        type: 'EVENT_CREATED',
        userId: 'user-test',
        eventId: 'event-1',
        orderId: undefined,
        read: false,
        sentEmail: false,
        sentInApp: true,
        createdAt: '2025-10-18T10:00:00.000Z',
        event: undefined,
        order: undefined,
        user: undefined,
      },
    ];
    const stats: NotificationStats = { total: 1, unread: 1 };
    const analyticsSummary: NotificationAnalyticsSummary = {
      companyId: 'company-123',
      totals: { notifications: 10, unread: 4 },
      delivery: { push: { SUCCESS: 9 } },
    };
    const notificationSettings = createMockNotificationSettings({ userId: 'user-test' });

    mockNotificationApi({
      notifications,
      stats,
      analytics: analyticsSummary,
      settings: notificationSettings,
    });

    const { result } = renderNotificationsFeature();

    await waitFor(() => {
      expect(result.current.all.isSuccess).toBe(true);
      expect(result.current.stats.isSuccess).toBe(true);
    });
    await waitFor(() => {
      expect(result.current.analytics.isSuccess).toBe(true);
      expect(result.current.settings.isSuccess).toBe(true);
    });

    expect(result.current.all.data).toHaveLength(1);
    expect(result.current.unread.data).toHaveLength(1);
    expect(result.current.limited.data).toHaveLength(1);
    expect(result.current.stats.data).toEqual({ total: 1, unread: 1 });
    expect(result.current.analytics.data).toEqual(analyticsSummary);
    expect(result.current.settings.data).toEqual(notificationSettings);
    expect(useNotificationsRealtimeStore.getState().status).toBe('connecting');
    expect(useNotificationsRealtimeStore.getState().fallbackPollingMs).toBe(
      DEFAULT_FALLBACK_MS,
    );

    const handshake = createMockHandshakeResponse({
      user: { id: 'user-test', companyId: 'company-123' },
      fallbackPollingMs: 45_000,
    });

    await act(async () => {
      emitClientEvent(GATEWAY_HANDSHAKE_EVENT, handshake);
    });

    await waitFor(() => {
      expect(useNotificationsRealtimeStore.getState().status).toBe('connected');
      expect(useNotificationsRealtimeStore.getState().fallbackPollingMs).toBe(
        45_000,
      );
    });

    const realtimeNotification: NotificationEvent = {
      id: 'realtime-1',
      type: 'EVENT_CREATED',
      userId: 'user-test',
      eventId: 'event-2',
      orderId: undefined,
      read: false,
      sentEmail: false,
      sentInApp: true,
      createdAt: '2025-10-19T12:00:00.000Z',
      companyId: 'company-123',
      event: undefined,
      order: undefined,
      user: undefined,
    } as NotificationEvent & { companyId: string };

    await act(async () => {
      emitClientEvent(NOTIFICATION_CREATED_EVENT, realtimeNotification);
    });

    await waitFor(() => {
      expect(result.current.all.data?.[0].id).toBe('realtime-1');
      expect(result.current.unread.data?.[0].id).toBe('realtime-1');
      expect(result.current.limited.data).toHaveLength(1);
    });

    await waitFor(() => {
      expect(result.current.stats.data).toEqual({ total: 2, unread: 2 });
    });
  });

  test('falls back to polling when websocket disconnects', async () => {
    mockNotificationApi({
      notifications: [],
      stats: { total: 0, unread: 0 },
      analytics: {
        companyId: 'company-123',
        totals: { notifications: 0, unread: 0 },
        delivery: {},
      },
      settings: createMockNotificationSettings({ userId: 'user-test' }),
    });

    const { result } = renderNotificationsFeature();

    await waitFor(() => expect(result.current.all.isSuccess).toBe(true));

    await act(async () => {
      emitClientEvent(GATEWAY_HANDSHAKE_EVENT, createMockHandshakeResponse());
    });

    await waitFor(() => {
      expect(useNotificationsRealtimeStore.getState().status).toBe('connected');
    });

    await act(async () => {
      emitClientEvent('disconnect');
    });

    await waitFor(() => {
      expect(useNotificationsRealtimeStore.getState().status).toBe('fallback');
    });
    expect(useNotificationsRealtimeStore.getState().fallbackPollingMs).toBe(
      DEFAULT_FALLBACK_MS,
    );
  });

  test('respects optimistic updates when marking notifications as read', async () => {
    const notifications: NotificationEvent[] = [
      {
        id: 'existing-1',
        type: 'EVENT_CREATED',
        userId: 'user-test',
        eventId: 'event-1',
        orderId: undefined,
        read: false,
        sentEmail: false,
        sentInApp: true,
        createdAt: '2025-10-18T10:00:00.000Z',
        event: undefined,
        order: undefined,
        user: undefined,
      },
      {
        id: 'existing-2',
        type: 'EVENT_CREATED',
        userId: 'user-test',
        eventId: 'event-2',
        orderId: undefined,
        read: false,
        sentEmail: false,
        sentInApp: true,
        createdAt: '2025-10-18T11:00:00.000Z',
        event: undefined,
        order: undefined,
        user: undefined,
      },
    ];
    const stats: NotificationStats = { total: 2, unread: 2 };

    const analyticsSummary: NotificationAnalyticsSummary = {
      companyId: 'company-123',
      totals: { notifications: stats.total, unread: stats.unread },
      delivery: { websocket: { SUCCESS: 5 } },
    };
    mockNotificationApi({
      notifications,
      stats,
      analytics: analyticsSummary,
      settings: createMockNotificationSettings({ userId: 'user-test' }),
    });

    vi.spyOn(apiClient, 'patch').mockImplementation(async (url: string) => {
      const id = url.replace('/notifications/', '').replace('/read', '');
      const target = notifications.find((notification) => notification.id === id);
      if (target) {
        target.read = true;
      }
      stats.unread = Math.max(0, stats.unread - 1);
      return { data: { data: { success: true } } };
    });

    const { result } = renderNotificationsFeature();

    await waitFor(() => {
      expect(result.current.all.isSuccess).toBe(true);
      expect(result.current.stats.isSuccess).toBe(true);
    });

    await act(async () => {
      emitClientEvent(GATEWAY_HANDSHAKE_EVENT, createMockHandshakeResponse());
    });

    await act(async () => {
      await result.current.markAsRead.mutateAsync('existing-1');
    });

    await waitFor(() => {
      const allIds = result.current.all.data?.map((item) => ({ id: item.id, read: item.read }));
      expect(allIds).toEqual([
        { id: 'existing-1', read: true },
        { id: 'existing-2', read: false },
      ]);
    });

    await waitFor(() => {
      expect(result.current.unread.data?.every((item) => item.id !== 'existing-1')).toBe(true);
      expect(result.current.stats.data).toEqual({ total: 2, unread: 1 });
    });
  });

  test('marks all notifications as read with optimistic cache updates', async () => {
    const notifications: NotificationEvent[] = [
      {
        id: 'existing-1',
        type: 'EVENT_CREATED',
        userId: 'user-test',
        eventId: 'event-1',
        orderId: undefined,
        read: false,
        sentEmail: false,
        sentInApp: true,
        createdAt: '2025-10-18T10:00:00.000Z',
        event: undefined,
        order: undefined,
        user: undefined,
      },
      {
        id: 'existing-2',
        type: 'USER_JOINED_EVENT',
        userId: 'user-test',
        eventId: 'event-2',
        orderId: undefined,
        read: false,
        sentEmail: false,
        sentInApp: true,
        createdAt: '2025-10-18T11:00:00.000Z',
        event: undefined,
        order: undefined,
        user: undefined,
      },
    ];
    const stats: NotificationStats = { total: 2, unread: 2 };
    const analyticsSummary: NotificationAnalyticsSummary = {
      companyId: 'company-123',
      totals: { notifications: stats.total, unread: stats.unread },
      delivery: { websocket: { SUCCESS: 2 } },
    };

    const notificationsState = notifications.map((item) => ({ ...item }));
    const statsState = { ...stats };

    mockNotificationApi({
      notifications: notificationsState,
      stats: statsState,
      analytics: analyticsSummary,
      settings: createMockNotificationSettings({ userId: 'user-test' }),
    });

    const postMock = vi
      .spyOn(apiClient, 'post')
      .mockImplementation(async (url: string) => {
        if (url === '/notifications/mark-all-read') {
          notificationsState.forEach((notification) => {
            notification.read = true;
          });
          statsState.unread = 0;
          return { data: { data: { success: true } } } as any;
        }
        throw new Error(`Unexpected POST ${url}`);
      });

    const { result } = renderNotificationsFeature();

    await waitFor(() => {
      expect(result.current.all.isSuccess).toBe(true);
      expect(result.current.stats.isSuccess).toBe(true);
    });

    await act(async () => {
      await result.current.markAllAsRead.mutateAsync();
    });

    await waitFor(() => {
      expect(result.current.all.data?.every((item) => item.read)).toBe(true);
      expect(result.current.unread.data).toEqual([]);
      expect(result.current.stats.data).toEqual({ total: 2, unread: 0 });
    });

    expect(postMock).toHaveBeenCalledWith('/notifications/mark-all-read');
  });

  test('updates notification settings and refetches analytics summary', async () => {
    const stats: NotificationStats = { total: 0, unread: 0 };
    const notifications: NotificationEvent[] = [];
    const analyticsSummary: NotificationAnalyticsSummary = {
      companyId: 'company-123',
      totals: { notifications: 0, unread: 0 },
      delivery: {},
    };
    const settingsState = createMockNotificationSettings({
      userId: 'user-test',
      emailNotifications: true,
    });

    mockNotificationApi({
      notifications,
      stats,
      analytics: analyticsSummary,
      settings: settingsState,
    });

    const putMock = vi
      .spyOn(apiClient, 'put')
      .mockImplementation(async (_url: string, payload?: any) => {
        Object.assign(settingsState, payload, { updatedAt: new Date().toISOString() });
        return { data: { data: { ...settingsState } } };
      });

    const { result } = renderNotificationsFeature();

    await waitFor(() => {
      expect(result.current.settings.isSuccess).toBe(true);
      expect(result.current.analytics.isSuccess).toBe(true);
    });

    await act(async () => {
      await result.current.updateSettings.mutateAsync({ emailNotifications: false });
    });

    await waitFor(() => {
      expect(result.current.settings.data?.emailNotifications).toBe(false);
    });

    expect(putMock).toHaveBeenCalledWith('/notifications/settings', { emailNotifications: false });
  });

  test('queues service worker push notifications while hidden and flushes on visibility change', async () => {
    const notifications: NotificationEvent[] = [
      {
        id: 'existing-1',
        type: 'EVENT_CREATED',
        userId: 'user-test',
        eventId: 'event-1',
        orderId: undefined,
        read: false,
        sentEmail: false,
        sentInApp: true,
        createdAt: '2025-10-18T10:00:00.000Z',
        event: undefined,
        order: undefined,
        user: undefined,
      },
    ];
    const stats: NotificationStats = { total: 1, unread: 1 };
    const analyticsSummary: NotificationAnalyticsSummary = {
      companyId: 'company-123',
      totals: { notifications: stats.total, unread: stats.unread },
      delivery: { push: { SUCCESS: 1 } },
    };

    mockNotificationApi({
      notifications,
      stats,
      analytics: analyticsSummary,
      settings: createMockNotificationSettings({ userId: 'user-test' }),
    });

    const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    const { result } = renderNotificationsFeature();

    await waitFor(() => {
      expect(result.current.all.isSuccess).toBe(true);
    });

    await act(async () => {
      emitClientEvent(GATEWAY_HANDSHAKE_EVENT, createMockHandshakeResponse());
    });

    await waitFor(() => {
      expect(useNotificationsRealtimeStore.getState().status).toBe('connected');
    });

    expect(useNotificationQueueStore.getState().pendingBadgeCount).toBe(0);

    emitServiceWorkerMessage({
      type: 'PUSH_NOTIFICATION_RECEIVED',
      payload: { notificationId: 'realtime-hidden-1' },
    });

    expect(useNotificationQueueStore.getState().pendingBadgeCount).toBe(1);

    const newNotification: NotificationEvent = {
      id: 'realtime-hidden-1',
      type: 'EVENT_CREATED',
      userId: 'user-test',
      eventId: 'event-2',
      orderId: undefined,
      read: false,
      sentEmail: true,
      sentInApp: true,
      createdAt: '2025-10-19T08:00:00.000Z',
      event: undefined,
      order: undefined,
      user: undefined,
    };

    notifications.unshift(newNotification);
    stats.total = 2;
    stats.unread = 2;
    analyticsSummary.totals = { notifications: stats.total, unread: stats.unread };

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      expect(result.current.all.data?.[0].id).toBe('realtime-hidden-1');
    });
    await waitFor(() => {
      expect(result.current.stats.data).toEqual({ total: 2, unread: 2 });
    });

    expect(useNotificationQueueStore.getState().pendingBadgeCount).toBe(0);

    if (visibilityDescriptor) {
      Object.defineProperty(document, 'visibilityState', visibilityDescriptor);
    }
  });

  test('handshake schema enforces fallback interval presence', () => {
    const result = handshakeSchema.safeParse({
      connectionId: 'test-conn',
      heartbeatMs: 25_000,
      fallbackPollingMs: 30_000,
      featureFlags: { notificationsRealtime: true },
      user: { id: 'user_1', companyId: 'company_1' },
    });

    expect(result.success).toBe(true);
  });
});
