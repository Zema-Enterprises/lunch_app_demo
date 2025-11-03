import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotifications } from '@/lib/api/hooks';
import { useNotificationStats } from '@/lib/api/hooks';
import { useNotificationsRealtime } from '@/lib/realtime/useNotificationsRealtime';
import { useNotificationsRealtimeStore, DEFAULT_FALLBACK_MS } from '@/store/notificationsRealtimeStore';
import apiClient from '@/lib/api/client';
import { createMockHandshakeResponse } from '@/lib/realtime/handshake';
import { useAuthStore } from '@/store/authStore';

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
  list: ReturnType<typeof useNotifications>;
  stats: ReturnType<typeof useNotificationStats>;
};

const initialAuthState = useAuthStore.getState();

const createWrapper = (client: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

describe('notifications realtime integration', () => {
  let emitClientEvent: (event: string, payload?: any) => void;
  let resetClientMock: () => void;

  beforeEach(async () => {
    const socketModule: any = await import('socket.io-client');
    emitClientEvent = socketModule.emitClientEvent;
    resetClientMock = socketModule.resetClientMock;
    resetClientMock();
    vi.restoreAllMocks();
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
    });
  });

  const renderRealtimeHook = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const useCombinedHook = (): HookResult => {
      const list = useNotifications();
      const stats = useNotificationStats();
      useNotificationsRealtime();
      return { list, stats };
    };

    return renderHook(useCombinedHook, {
      wrapper: createWrapper(queryClient),
    });
  };

  it('hydrates notifications cache from realtime events and disables polling after handshake', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/notifications/stats') {
        return {
          data: {
            data: {
              total: 1,
              unread: 1,
            },
          },
        };
      }

      if (url.startsWith('/notifications')) {
        return {
          data: {
            data: [
              {
                id: 'existing-notification',
                type: 'EVENT_CREATED',
                userId: 'user-test',
                eventId: 'event-existing',
                orderId: undefined,
                read: false,
                sentEmail: false,
                sentInApp: true,
                createdAt: '2025-10-18T10:00:00.000Z',
              },
            ],
          },
        };
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    const { result } = renderRealtimeHook();

    await waitFor(() => {
      expect(result.current.list.isSuccess).toBe(true);
      expect(result.current.stats.isSuccess).toBe(true);
    });

    await waitFor(() => {
      expect(useNotificationsRealtimeStore.getState().status).toBe('connecting');
    });

    expect(result.current.list.data).toHaveLength(1);
    expect(result.current.stats.data).toEqual({ total: 1, unread: 1 });
    await waitFor(() => {
      expect(useNotificationsRealtimeStore.getState().status).toBe('connecting');
    });
    expect(useNotificationsRealtimeStore.getState().fallbackPollingMs).toBe(DEFAULT_FALLBACK_MS);

    const handshake = createMockHandshakeResponse({
      user: { id: 'user-test', companyId: 'company-123' },
      featureFlags: { notificationsRealtime: true },
      fallbackPollingMs: 45_000,
    });

    await act(async () => {
      emitClientEvent('gateway.handshake', handshake);
    });

    await waitFor(() => {
      expect(useNotificationsRealtimeStore.getState().status).toBe('connected');
      expect(useNotificationsRealtimeStore.getState().fallbackPollingMs).toBe(45_000);
    });

    const realtimePayload = {
      id: 'realtime-1',
      companyId: 'company-123',
      userId: 'user-test',
      type: 'EVENT_CREATED',
      createdAt: '2025-10-19T12:00:00.000Z',
      read: false,
      sentEmail: false,
      sentInApp: true,
    };

    const start = performance.now();

    await act(async () => {
      emitClientEvent('notification.created', realtimePayload);
    });

    await waitFor(() => {
      expect(result.current.list.data?.[0].id).toBe('realtime-1');
      expect(result.current.list.data).toHaveLength(2);
    });

    await waitFor(() => {
      expect(result.current.stats.data).toEqual({ total: 2, unread: 2 });
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);

    await act(async () => {
      emitClientEvent('disconnect');
    });

    await waitFor(() => {
      expect(useNotificationsRealtimeStore.getState().status).toBe('fallback');
      expect(useNotificationsRealtimeStore.getState().fallbackPollingMs).toBe(45_000);
    });
  });

});
