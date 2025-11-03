import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import NotificationList from '@/components/notifications/NotificationList';
import { render } from '../../utils/test-utils';
import { server } from '../../mocks/server';
import {
  createMockNotificationStats,
  createMockNotifications,
} from '../../utils/factories';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotificationList Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Rendering & Filters', () => {
    it('should render heading and filter tabs', async () => {
      render(<NotificationList />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /notifications/i })
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /unread/i })).toBeInTheDocument();
      });
    });

    it('should show "All" tab as active by default and include unread count', async () => {
      const mockNotifications = createMockNotifications(4, { someRead: true });

      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ data: mockNotifications });
        })
      );

      render(<NotificationList />);

      await waitFor(() => {
        const allButton = screen.getByRole('button', { name: /^all$/i });
        const unreadButton = screen.getByRole('button', { name: /unread/i });

        expect(allButton).toHaveClass('border-blue-500');
        expect(unreadButton.textContent).toMatch(/\(2\)/);
      });
    });

    it('should switch to "Unread" filter when clicked', async () => {
      const user = userEvent.setup();

      server.use(
        http.get('http://localhost:5000/api/notifications', ({ request }) => {
          const url = new URL(request.url);
          const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

          if (unreadOnly) {
            return HttpResponse.json({
              data: createMockNotifications(2).map((notification) => ({
                ...notification,
                read: false,
              })),
            });
          }

          return HttpResponse.json({
            data: createMockNotifications(5, { someRead: true }),
          });
        })
      );

      render(<NotificationList />);

      const unreadButton = await screen.findByRole('button', { name: /unread/i });
      await user.click(unreadButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /unread/i })).toHaveClass(
          'border-blue-500'
        );
      });
    });

    it('should default to unread filter when unreadOnly prop is true', async () => {
      server.use(
        http.get('http://localhost:5000/api/notifications', ({ request }) => {
          const url = new URL(request.url);
          const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

          return HttpResponse.json({
            data: createMockNotifications(unreadOnly ? 3 : 5).map((notification) =>
              unreadOnly
                ? { ...notification, read: false }
                : notification
            ),
          });
        })
      );

      render(<NotificationList unreadOnly />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /unread/i })).toHaveClass(
          'border-blue-500'
        );
      });
    });
  });

  describe('Notification Display', () => {
    it('should show notification titles, event details, and timestamps', async () => {
      const mockNotifications = createMockNotifications(3);

      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ data: mockNotifications });
        })
      );

      render(<NotificationList />);

      await waitFor(() => {
        expect(
          screen.getAllByRole('heading', { name: /new event created/i }).length
        ).toBeGreaterThan(0);
        expect(screen.getAllByText(/team lunch/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/ago/i).length).toBeGreaterThan(0);
      });
    });

    it('should highlight unread notifications with indicator', async () => {
      const mockNotifications = createMockNotifications(4, { someRead: true });

    server.use(
      http.get('http://localhost:5000/api/notifications', () => {
        return HttpResponse.json({ data: mockNotifications });
      })
    );

    render(<NotificationList />);

    await waitFor(() => {
      const unreadIndicators = document.querySelectorAll('span[aria-hidden="true"].bg-blue-500');
      expect(unreadIndicators.length).toBeGreaterThan(0);
    });
  });
  });

  describe('Mark as Read Actions', () => {
    it('should mark individual notification as read when check button clicked', async () => {
      const user = userEvent.setup();
      const mockNotifications = createMockNotifications(3).map((notification) => ({
        ...notification,
        read: false,
      }));

      let markReadCalled = false;
      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ data: mockNotifications });
        }),
        http.patch('http://localhost:5000/api/notifications/:id/read', () => {
          markReadCalled = true;
          return HttpResponse.json({ data: { success: true } });
        })
      );

      render(<NotificationList />);

      const markAsReadButtons = await screen.findAllByLabelText(/mark as read/i);
      await user.click(markAsReadButtons[0]);

      await waitFor(() => {
        expect(markReadCalled).toBe(true);
      });
    });

    it('should show "Mark all as read" button when unread notifications exist', async () => {
      const mockNotifications = createMockNotifications(3).map((notification) => ({
        ...notification,
        read: false,
      }));

      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ data: mockNotifications });
        })
      );

      render(<NotificationList />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /mark all as read/i })).toBeInTheDocument();
      });
    });

    it('should mark all notifications as read when "Mark all as read" clicked', async () => {
      const user = userEvent.setup();
      const mockNotifications = createMockNotifications(3).map((notification) => ({
        ...notification,
        read: false,
      }));

      let markAllReadCalled = false;
      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ data: mockNotifications });
        }),
        http.post('http://localhost:5000/api/notifications/mark-all-read', () => {
          markAllReadCalled = true;
          return HttpResponse.json({ data: { success: true } });
        })
      );

      render(<NotificationList />);

      const markAllButton = await screen.findByRole('button', {
        name: /mark all as read/i,
      });
      await user.click(markAllButton);

      await waitFor(() => {
        expect(markAllReadCalled).toBe(true);
      });
    });
  });

  describe('Performance & Virtualization', () => {
    it('virtualizes long notification lists and limits rendered rows', async () => {
      const notifications = createMockNotifications(120, { someRead: true }).map(
        (notification, index) => ({
          ...notification,
          id: `virtualized-${index + 1}`,
        })
      );

      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ data: notifications });
        })
      );

      render(<NotificationList />);

      const scrollRegion = await screen.findByTestId('notification-scroll-region');
      expect(scrollRegion).toHaveAttribute('data-virtualized', 'true');

      await waitFor(() => {
        expect(screen.getAllByTestId('notification-row').length).toBeGreaterThan(0);
      });

      const renderedRows = screen.getAllByTestId('notification-row');
      expect(renderedRows.length).toBeLessThanOrEqual(24);
    });
  });

  describe('Navigation', () => {
    it('should navigate to event when notification with eventId is clicked', async () => {
      const user = userEvent.setup();
      const mockNotifications = createMockNotifications(2).map((notification) => ({
        ...notification,
        read: false,
      }));

      let markReadCalled = false;
      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ data: mockNotifications });
        }),
        http.patch('http://localhost:5000/api/notifications/:id/read', () => {
          markReadCalled = true;
          return HttpResponse.json({ data: { success: true } });
        })
      );

      render(<NotificationList />);

      const viewButtons = await screen.findAllByRole('button', {
        name: /open notification details/i,
      });

      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(markReadCalled).toBe(true);
        expect(mockNavigate).toHaveBeenCalledWith('/events/event-1');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton while fetching notifications', () => {
      render(<NotificationList />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no notifications exist (All tab)', async () => {
      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ data: [] });
        }),
        http.get('http://localhost:5000/api/notifications/stats', () => {
          return HttpResponse.json({ 
            data: createMockNotificationStats({ unread: 0, total: 0 })
          });
        })
      );

      render(<NotificationList />);

      await waitFor(() => {
        expect(
          screen.getByText(/no notifications yet/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/you'll see updates about events and orders here/i)
        ).toBeInTheDocument();
      });
    });

    it('should show "all caught up" message when no unread notifications (Unread tab)', async () => {
      const user = userEvent.setup();

      server.use(
        http.get('http://localhost:5000/api/notifications', ({ request }) => {
          const url = new URL(request.url);
          const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

          if (unreadOnly) {
            return HttpResponse.json({ data: [] });
          }

          return HttpResponse.json({
            data: createMockNotifications(5).map((notification) => ({
              ...notification,
              read: true,
            })),
          });
        }),
        http.get('http://localhost:5000/api/notifications/stats', () => {
          return HttpResponse.json({
            data: createMockNotificationStats({ unread: 0, total: 5 }),
          });
        })
      );

      render(<NotificationList />);

      const unreadButton = await screen.findByRole('button', { name: /unread/i });
      await user.click(unreadButton);

      await waitFor(() => {
        expect(screen.getByText(/no unread notifications/i)).toBeInTheDocument();
        expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          );
        })
      );

      render(<NotificationList />);

      // Component should not crash - stays in loading or shows empty state
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /notifications/i, level: 1 })
        ).toBeInTheDocument();
      });
    });
  });
});
