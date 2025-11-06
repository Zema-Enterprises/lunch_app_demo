import { describe, it, expect, beforeEach } from 'vitest';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import App from '@/App';
import { server } from '../mocks/server';
import { mockUser, mockStats } from '../mocks/handlers';
import {
  createMockNotificationSettings,
  createMockNotificationStats,
  createMockNotifications,
  createMockEvent,
} from '../utils/factories';
import type { UserNotificationSettings } from '@/types';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = 'http://localhost:5000/api';

const renderApp = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return {
    queryClient,
    ...rtlRender(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    ),
  };
};

const loginUser = async (user: ReturnType<typeof userEvent['setup']>) => {
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /welcome to lunchsync/i })).toBeInTheDocument();
  });

  await user.type(screen.getByLabelText(/email/i), mockUser.email);
  await user.type(screen.getByLabelText(/password/i), 'Password123!');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => {
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
};

describe('Notification Workflow Integration', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    window.history.pushState({}, '', '/');

    server.use(
      http.post(`${API_BASE_URL}/auth/login`, async () =>
        HttpResponse.json({
          data: { token: 'test-token', user: mockUser },
        })
      ),
      http.get(`${API_BASE_URL}/users/stats`, () => HttpResponse.json({ data: mockStats }))
    );
  });

  it('allows user to open notification dropdown, navigate, and mark a notification as read', async () => {
    const notifications = createMockNotifications(3).map((notification, index) => ({
      ...notification,
      id: `notification-${index + 1}`,
      eventId: `event-${index + 1}`,
      event: createMockEvent({ id: `event-${index + 1}`, title: `Event ${index + 1}` }),
      read: index !== 0,
    }));

    let markAsReadCalled = false;

    server.use(
      http.get(`${API_BASE_URL}/notifications/stats`, () =>
        HttpResponse.json({
          data: createMockNotificationStats({ unread: 1, total: notifications.length }),
        })
      ),
      http.get(`${API_BASE_URL}/notifications`, () =>
        HttpResponse.json({ data: notifications })
      ),
      http.patch(`${API_BASE_URL}/notifications/:id/read`, ({ params }) => {
        markAsReadCalled = params.id === 'notification-1';
        return HttpResponse.json({ data: { success: true } });
      })
    );

    const { queryClient } = renderApp();
    const user = userEvent.setup();

    await loginUser(user);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const menuItems = await screen.findAllByRole('menuitem');
    expect(menuItems.length).toBeGreaterThan(0);

    await user.click(menuItems[0]);

    await waitFor(() => {
      expect(markAsReadCalled).toBe(true);
      expect(window.location.pathname).toBe('/events/event-1');
    });

    queryClient.clear();
  });

  it('allows marking all notifications as read from the dropdown', async () => {
    const notifications = createMockNotifications(2).map((notification, index) => ({
      ...notification,
      id: `notification-${index + 1}`,
      read: false,
    }));

    let bulkMarkCalled = false;

    server.use(
      http.get(`${API_BASE_URL}/notifications/stats`, () =>
        HttpResponse.json({
          data: createMockNotificationStats({ unread: notifications.length, total: notifications.length }),
        })
      ),
      http.get(`${API_BASE_URL}/notifications`, () =>
        HttpResponse.json({ data: notifications })
      ),
      http.post(`${API_BASE_URL}/notifications/mark-all-read`, () => {
        bulkMarkCalled = true;
        return HttpResponse.json({ data: { count: notifications.length } });
      })
    );

    const { queryClient } = renderApp();
    const user = userEvent.setup();

    await loginUser(user);

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const viewAllButton = await screen.findByRole('button', { name: /view all notifications/i });
    await user.click(viewAllButton);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/notifications');
    });

    const bulkButton = await screen.findByRole('button', { name: /mark all as read/i });
    await user.click(bulkButton);

    await waitFor(() => {
      expect(bulkMarkCalled).toBe(true);
    });

    queryClient.clear();
  });

  it('persists notification settings updates via settings workflow', async () => {
    let settingsUpdated = false;

    server.use(
      http.get(`${API_BASE_URL}/notifications/settings`, () =>
        HttpResponse.json({ data: createMockNotificationSettings({ emailNotifications: true }) })
      ),
      http.put(`${API_BASE_URL}/notifications/settings`, async ({ request }) => {
        const body = (await request.json()) as Partial<UserNotificationSettings>;
        settingsUpdated = body.emailNotifications === false;
        return HttpResponse.json({ data: { ...createMockNotificationSettings(), ...body } });
      })
    );

    const { queryClient } = renderApp();
    const user = userEvent.setup();

    await loginUser(user);

    await act(async () => {
      window.history.pushState({}, '', '/settings/notifications');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /notification settings/i })).toBeInTheDocument();
    });

    const emailToggle = screen.getByRole('checkbox', { name: /toggle email notifications/i });
    await user.click(emailToggle);

    await waitFor(() => {
      expect(screen.getByText(/you have unsaved changes/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(settingsUpdated).toBe(true);
      expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument();
    });

    queryClient.clear();
  });

  it('shows unread tab empty state after filtering read notifications', async () => {
    const notifications = createMockNotifications(3).map((notification, index) => ({
      ...notification,
      id: `notification-${index + 1}`,
      read: true,
      event: createMockEvent({ id: `event-${index + 1}`, title: `Event ${index + 1}` }),
    }));

    server.use(
      http.get(`${API_BASE_URL}/notifications/stats`, () =>
        HttpResponse.json({
          data: createMockNotificationStats({ unread: 0, total: notifications.length }),
        })
      ),
      http.get(`${API_BASE_URL}/notifications`, ({ request }) => {
        const url = new URL(request.url);
        const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
        const data = unreadOnly ? notifications.filter((n) => !n.read) : notifications;
        return HttpResponse.json({ data });
      })
    );

    const { queryClient } = renderApp();
    const user = userEvent.setup();

    await loginUser(user);

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    await user.click(await screen.findByRole('button', { name: /view all notifications/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/notifications');
    });

    await user.click(screen.getByRole('button', { name: /^unread/i }));

    await waitFor(() => {
      expect(screen.getByText(/no unread notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument();
    });

    queryClient.clear();
  });

  it('displays empty state when no notifications exist', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications/stats`, () =>
        HttpResponse.json({ data: createMockNotificationStats({ unread: 0, total: 0 }) })
      ),
      http.get(`${API_BASE_URL}/notifications`, () =>
        HttpResponse.json({ data: [] })
      )
    );

    const { queryClient } = renderApp();
    const user = userEvent.setup();

    await loginUser(user);

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await waitFor(() => {
      expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
      expect(screen.getByText(/you'll see updates about events here/i)).toBeInTheDocument();
    });

    queryClient.clear();
  });
});
