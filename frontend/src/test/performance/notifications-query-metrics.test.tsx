import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import type { Query } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import NotificationBell from '@/components/notifications/NotificationBell';
import { render } from '../utils/test-utils';
import { server } from '../mocks/server';
import {
  createMockNotifications,
  createMockNotificationStats,
} from '../utils/factories';
import { useNotificationsRealtimeStore } from '@/store/notificationsRealtimeStore';
import { createMockHandshakeResponse } from '@/lib/realtime/handshake';

const API_BASE_URL = 'http://localhost:5000/api';

const getRefetchInterval = (query?: Query): number | false | undefined => {
  const options = query?.options as { refetchInterval?: number | false } | undefined;
  return options?.refetchInterval;
};

describe('Notification query metrics', () => {
  beforeEach(() => {
    server.resetHandlers();
    vi.useRealTimers();
  });

  afterEach(() => {
    server.resetHandlers();
    vi.useRealTimers();
  });

  it('shares React Query cache across NotificationBell instances', async () => {
    let notificationsRequests = 0;
    let statsRequests = 0;

    server.use(
      http.get(`${API_BASE_URL}/notifications`, () => {
        notificationsRequests += 1;
        return HttpResponse.json({ data: createMockNotifications(5) });
      }),
      http.get(`${API_BASE_URL}/notifications/stats`, () => {
        statsRequests += 1;
        return HttpResponse.json({
          data: createMockNotificationStats({ unread: 4, total: 5 }),
        });
      })
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 5 * 60_000,
          staleTime: 15_000,
        },
        mutations: { retry: false },
      },
    });

    const { rerender } = render(
      <>
        <NotificationBell />
        <NotificationBell />
      </>,
      { queryClient }
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /notifications/i }).length
      ).toBe(2);
    });

    expect(notificationsRequests).toBe(1);
    expect(statsRequests).toBe(1);

    rerender(
      <>
        <NotificationBell />
        <NotificationBell />
        <NotificationBell />
      </>
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /notifications/i }).length
      ).toBe(3);
    });

    expect(notificationsRequests).toBe(1);
    expect(statsRequests).toBe(1);

    const consumers = 3;
    const notificationHitRate = (consumers - notificationsRequests) / consumers;
    const statsHitRate = (consumers - statsRequests) / consumers;

    expect(notificationHitRate).toBeGreaterThanOrEqual(0.66);
    expect(statsHitRate).toBeGreaterThanOrEqual(0.66);
  });

  it('documents polling cadence for notifications queries', async () => {
    let notificationsRequests = 0;
    let statsRequests = 0;

    server.use(
      http.get(`${API_BASE_URL}/notifications`, () => {
        notificationsRequests += 1;
        return HttpResponse.json({ data: createMockNotifications(5) });
      }),
      http.get(`${API_BASE_URL}/notifications/stats`, () => {
        statsRequests += 1;
        return HttpResponse.json({
          data: createMockNotificationStats({ unread: 3, total: 5 }),
        });
      })
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 5 * 60_000,
          staleTime: 15_000,
        },
        mutations: { retry: false },
      },
    });

    const { queryClient: client } = render(<NotificationBell />, { queryClient });

    await screen.findByRole('button', { name: /notifications/i });
    expect(notificationsRequests).toBe(1);
    expect(statsRequests).toBe(1);

    const notificationsQuery = client
      .getQueryCache()
      .find({ queryKey: ['notifications', 'all', 'limit:5'] });
    const statsQuery = client.getQueryCache().find({ queryKey: ['notifications', 'stats'] });

    expect(notificationsQuery).toBeDefined();
    expect(statsQuery).toBeDefined();

    const notificationInterval = getRefetchInterval(notificationsQuery) as number;
    const statsInterval = getRefetchInterval(statsQuery) as number;

    expect(notificationInterval).toBe(30_000);
    expect(statsInterval).toBe(30_000);

    const pollsPerMinute = 60_000 / notificationInterval;
    expect(pollsPerMinute).toBeCloseTo(2, 2);
  });

  it('disables polling once realtime connection is established', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications`, () =>
        HttpResponse.json({ data: createMockNotifications(5) })
      ),
      http.get(`${API_BASE_URL}/notifications/stats`, () =>
        HttpResponse.json({
          data: createMockNotificationStats({ unread: 4, total: 5 }),
        })
      )
    );

    const fallbackClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const { unmount: unmountFallback } = render(<NotificationBell />, {
      queryClient: fallbackClient,
    });

    await screen.findByRole('button', { name: /notifications/i });

    const fallbackQuery = fallbackClient
      .getQueryCache()
      .find({ queryKey: ['notifications', 'all', 'limit:5'] });
    const fallbackStatsQuery = fallbackClient
      .getQueryCache()
      .find({ queryKey: ['notifications', 'stats'] });

    expect(getRefetchInterval(fallbackQuery)).toBe(30_000);
    expect(getRefetchInterval(fallbackStatsQuery)).toBe(30_000);

    unmountFallback();
    useNotificationsRealtimeStore.getState().reset();
    server.resetHandlers();

    server.use(
      http.get(`${API_BASE_URL}/notifications`, () =>
        HttpResponse.json({ data: createMockNotifications(5) })
      ),
      http.get(`${API_BASE_URL}/notifications/stats`, () =>
        HttpResponse.json({
          data: createMockNotificationStats({ unread: 4, total: 5 }),
        })
      )
    );

    await act(async () => {
      useNotificationsRealtimeStore
        .getState()
        .applyHandshake(
          createMockHandshakeResponse({
            featureFlags: { notificationsRealtime: true },
            fallbackPollingMs: 45_000,
          })
        );
    });

    const realtimeClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const { unmount: unmountRealtime } = render(<NotificationBell />, {
      queryClient: realtimeClient,
    });

    await screen.findByRole('button', { name: /notifications/i });

    const realtimeQuery = realtimeClient
      .getQueryCache()
      .find({ queryKey: ['notifications', 'all', 'limit:5'] });
    const realtimeStatsQuery = realtimeClient
      .getQueryCache()
      .find({ queryKey: ['notifications', 'stats'] });

    expect(getRefetchInterval(realtimeQuery)).toBe(false);
    expect(getRefetchInterval(realtimeStatsQuery)).toBe(false);

    unmountRealtime();
    useNotificationsRealtimeStore.getState().reset();
    server.resetHandlers();
  });
});
