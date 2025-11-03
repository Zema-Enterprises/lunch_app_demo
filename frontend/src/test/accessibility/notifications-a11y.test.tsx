import { describe, it, expect, afterEach } from 'vitest';
import { screen, within, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from '@/components/notifications/NotificationBell';
import NotificationList from '@/components/notifications/NotificationList';
import NotificationSettings from '@/components/notifications/NotificationSettings';
import NotificationToast from '@/components/notifications/NotificationToast';
import { render } from '../utils/test-utils';
import {
  createMockNotifications,
  createMockNotificationSettings,
  createMockNotification,
  createMockNotificationStats,
} from '../utils/factories';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { runAxe } from '../utils/axe';

const API_BASE_URL = 'http://localhost:5000/api';

afterEach(() => {
  cleanup();
});

describe('Notification accessibility smoke tests', () => {
  it('NotificationBell is keyboard accessible and announces badge', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications/stats`, () =>
        HttpResponse.json({ data: createMockNotificationStats({ unread: 2, total: 2 }) })
      ),
      http.get(`${API_BASE_URL}/notifications`, () =>
        HttpResponse.json({ data: createMockNotifications(2) })
      )
    );

    const user = userEvent.setup();
    render(<NotificationBell />);

    const button = await screen.findByRole('button', { name: /notifications/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.tab();
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: /notifications menu/i })).toBeInTheDocument();
  });

  it('NotificationBell closes dropdown on Escape', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications/stats`, () =>
        HttpResponse.json({ data: createMockNotificationStats({ unread: 4, total: 4 }) })
      ),
      http.get(`${API_BASE_URL}/notifications`, () =>
        HttpResponse.json({ data: createMockNotifications(3) })
      )
    );

    const user = userEvent.setup();
    render(<NotificationBell />);

    const button = await screen.findByRole('button', { name: /notifications/i });
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: /notifications menu/i })).not.toBeInTheDocument();
    });
  });

  it('NotificationBell passes axe compliance checks', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications/stats`, () =>
        HttpResponse.json({ data: createMockNotificationStats({ unread: 3, total: 3 }) })
      ),
      http.get(`${API_BASE_URL}/notifications`, () =>
        HttpResponse.json({ data: createMockNotifications(3) })
      )
    );

    const { container } = render(<NotificationBell />);

    await screen.findByRole('button', { name: /notifications/i });

    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });

  it('NotificationList tabs are selectable via keyboard', async () => {
    const notifications = createMockNotifications(2).map((notification, index) => ({
      ...notification,
      id: `notification-${index + 1}`,
    }));

    server.use(
      http.get(`${API_BASE_URL}/notifications`, ({ request }) => {
        const url = new URL(request.url);
        const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
        const filtered = unreadOnly ? notifications.filter((n) => !n.read) : notifications;
        return HttpResponse.json({ data: filtered });
      })
    );

    const user = userEvent.setup();
    render(<NotificationList />);

    const allTab = await screen.findByRole('button', { name: /^all$/i });
    let unreadTab = screen.getByRole('button', { name: /unread/i });

    await user.tab();
    await user.tab();
    expect(allTab).toHaveFocus();

    await user.click(unreadTab);
    await waitFor(() => {
      unreadTab = screen.getByRole('button', { name: /unread/i });
      expect(unreadTab.className).toContain('border-blue-500');
    });
  });

  it('NotificationList passes axe compliance checks', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications`, () =>
        HttpResponse.json({ data: createMockNotifications(5) })
      )
    );

    const { container } = render(<NotificationList />);

    await screen.findByRole('heading', { name: /notifications/i });

    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });

  it('NotificationSettings switches have accessible names', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications/settings`, () =>
        HttpResponse.json({ data: createMockNotificationSettings() })
      )
    );

    render(<NotificationSettings />);

    const channelSection = await screen.findByRole('heading', { name: /notification channels/i });
    expect(channelSection).toBeInTheDocument();

    const toggle = screen.getByRole('checkbox', { name: /toggle email notifications/i });
    expect(toggle).toBeInTheDocument();
  });

  it('NotificationSettings passes axe compliance checks', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications/settings`, () =>
        HttpResponse.json({ data: createMockNotificationSettings() })
      )
    );

    const { container } = render(<NotificationSettings />);

    await screen.findByRole('heading', { name: /notification channels/i });

    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });

  it('NotificationToast exposes polite alert semantics', () => {
    const notification = createMockNotification({
      type: 'EVENT_CREATED',
    });

    render(<NotificationToast notification={notification} onDismiss={() => undefined} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(within(alert).getByText(/new event/i)).toBeInTheDocument();
  });

  it('NotificationToast passes axe compliance checks', async () => {
    const notification = createMockNotification({
      type: 'EVENT_CREATED',
    });

    const { container } = render(<NotificationToast notification={notification} onDismiss={() => undefined} />);

    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });
});
