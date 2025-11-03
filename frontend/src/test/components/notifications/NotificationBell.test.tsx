import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { render } from '../../utils/test-utils';
import NotificationBell from '@/components/notifications/NotificationBell';
import { server } from '../../mocks/server';
import { createMockNotifications, createMockNotificationStats } from '../../utils/factories';
import { useNotificationQueueStore } from '@/store/notificationQueueStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotificationBell Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    act(() => {
      useNotificationQueueStore.getState().clear();
    });
  });

  afterEach(() => {
    act(() => {
      useNotificationQueueStore.getState().clear();
    });
  });

  describe('Rendering', () => {
    it('should render bell icon button', () => {
      render(<NotificationBell />);
      const bellButton = screen.getByRole('button', { name: /notifications/i });
      expect(bellButton).toBeInTheDocument();
    });
  });

  describe('Badge Display', () => {
    it('should show badge when there are unread notifications', async () => {
      server.use(
        http.get('http://localhost:5000/api/notifications/stats', () => {
          return HttpResponse.json({ 
            data: createMockNotificationStats({ unread: 3, total: 10 })
          });
        })
      );

      render(<NotificationBell />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should not show badge when unread count is zero', async () => {
      server.use(
        http.get('http://localhost:5000/api/notifications/stats', () => {
          return HttpResponse.json({ 
            data: createMockNotificationStats({ unread: 0, total: 5 })
          });
        })
      );

      render(<NotificationBell />);

      await waitFor(() => {
        expect(screen.queryByText('0')).not.toBeInTheDocument();
      });
    });

    it('should display "99+" when unread count exceeds 99', async () => {
      server.use(
        http.get('http://localhost:5000/api/notifications/stats', () => {
          return HttpResponse.json({ 
            data: createMockNotificationStats({ unread: 150, total: 200 })
          });
        })
      );

      render(<NotificationBell />);

      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument();
      });
    });

    it('should include pending background queue count in badge and aria label', async () => {
      server.use(
        http.get('http://localhost:5000/api/notifications/stats', () => {
          return HttpResponse.json({
            data: createMockNotificationStats({ unread: 2, total: 10 }),
          });
        })
      );

      act(() => {
        useNotificationQueueStore.setState({
          queuedNotificationIds: ['n-101', 'n-102', 'n-103'],
          pendingBadgeCount: 3,
        });
      });

      render(<NotificationBell />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      expect(bellButton).toHaveAttribute('aria-label', expect.stringContaining('(5 unread)'));
    });
  });

  describe('Dropdown Menu', () => {
    it('should open dropdown when bell is clicked', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ 
            data: createMockNotifications(5)
          });
        })
      );

      render(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
    });

    it('should close dropdown when bell is clicked again', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ 
            data: createMockNotifications(5)
          });
        })
      );

      render(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      
      await user.click(bellButton);
      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });

      await user.click(bellButton);
      await waitFor(() => {
        expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
      });
    });

    it('should show empty state when no notifications exist', async () => {
      const user = userEvent.setup();
      
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

      render(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
      });
    });

    it('should show "View all" link in dropdown', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ 
            data: createMockNotifications(5)
          });
        })
      );

      render(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/view all/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notification Interactions', () => {
    it('should mark notification as read when clicked', async () => {
      const user = userEvent.setup();
      const mockNotifications = createMockNotifications(3);
      let markAsReadCalled = false;
      
      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ data: mockNotifications });
        }),
        http.patch('http://localhost:5000/api/notifications/:id/read', () => {
          markAsReadCalled = true;
          return HttpResponse.json({ data: { success: true } });
        })
      );

      render(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      await waitFor(async () => {
        const notificationButtons = screen.getAllByRole('button');
        const firstNotification = notificationButtons.find(btn => 
          btn.textContent?.includes('Event Created')
        );
        
        if (firstNotification) {
          await user.click(firstNotification);
          
          await waitFor(() => {
            expect(markAsReadCalled).toBe(true);
          });
        }
      });
    });

    it('should navigate to notifications page when "View all" is clicked', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json({ 
            data: createMockNotifications(5)
          });
        })
      );

      render(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      await waitFor(async () => {
        const viewAllLink = screen.getByText(/view all/i);
        await user.click(viewAllLink);
        
        expect(mockNavigate).toHaveBeenCalledWith('/notifications');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.get('http://localhost:5000/api/notifications', () => {
          return HttpResponse.json(
            { error: 'Server error' },
            { status: 500 }
          );
        })
      );

      render(<NotificationBell />);

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      expect(bellButton).toBeInTheDocument();
    });
  });
});
