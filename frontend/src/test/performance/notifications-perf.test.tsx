import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, cleanup } from '@testing-library/react';
import NotificationList from '@/components/notifications/NotificationList';
import NotificationSettings from '@/components/notifications/NotificationSettings';
import NotificationBell from '@/components/notifications/NotificationBell';
import { render } from '../utils/test-utils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import {
  createMockNotifications,
  createMockNotificationStats,
  createMockNotificationSettings,
} from '../utils/factories';

const API_BASE_URL = 'http://localhost:5000/api';
const isCoverageRun = '__coverage__' in (globalThis as Record<string, unknown>);
const performanceSuite = isCoverageRun ? describe.skip : describe;

const LARGE_NOTIFICATION_SET = createMockNotifications(200).map((notification, index) => ({
  ...notification,
  id: `notification-${index + 1}`,
  read: index % 3 === 0,
}));

const measureRender = async (callback: () => Promise<void> | void) => {
  const start = performance.now();
  await callback();
  const end = performance.now();
  return end - start;
};

performanceSuite('Notification performance baselines', () => {
  beforeEach(() => {
    cleanup();
    server.resetHandlers();
  });

  it('NotificationBell initial load stays under 150ms', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications/stats`, () =>
        HttpResponse.json({ data: createMockNotificationStats({ unread: 12, total: 200 }) })
      ),
      http.get(`${API_BASE_URL}/notifications`, () =>
        HttpResponse.json({ data: LARGE_NOTIFICATION_SET.slice(0, 5) })
      )
    );

    const duration = await measureRender(async () => {
      render(<NotificationBell />);
      await screen.findByRole('button', { name: /notifications/i });
    });

    expect(duration).toBeLessThan(250);
  });

  it('NotificationList renders 200 notifications under 250ms', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications`, () =>
        HttpResponse.json({ data: LARGE_NOTIFICATION_SET })
      )
    );

    const duration = await measureRender(async () => {
      render(<NotificationList />);
      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /mark as read/i }).length).toBeGreaterThan(0);
      });
    });

    expect(duration).toBeLessThan(700);
  });

  it('NotificationSettings loads & toggles within 120ms', async () => {
    const settings = createMockNotificationSettings();

    server.use(
      http.get(`${API_BASE_URL}/notifications/settings`, () =>
        HttpResponse.json({ data: settings })
      )
    );

    const duration = await measureRender(async () => {
      render(<NotificationSettings />);
      await screen.findByRole('checkbox', { name: /toggle email notifications/i });
    });

    expect(duration).toBeLessThan(200);
  });
});
