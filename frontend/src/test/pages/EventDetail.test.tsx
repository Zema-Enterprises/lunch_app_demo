/**
 * EventDetail Page Tests
 * 
 * Tests the event detail page that displays:
 * - Event information (title, description, deadline, status)
 * - Restaurant details
 * - Participants list
 * - Orders list
 * - Join event button (if not already joined)
 * - Place order button/link
 * - Navigation breadcrumbs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import EventDetail from '@/pages/EventDetail';
import { 
  createMockEvent, 
  createMockUser, 
  createMockRestaurant,
  createMockOrder,
  createMockMenuItem,
  createMockEventParticipant,
} from '../utils/factories';

const API_BASE_URL = 'http://localhost:5000/api';

const mockUser = createMockUser({ id: 'user-1', role: 'USER' });

// Mock auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: mockUser,
    token: 'mock-token',
    isAuthenticated: true,
  })),
}));

const renderEventDetail = (eventId: string = 'event-1') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/events/${eventId}`]}>
        <Routes>
          <Route path="/events/:id" element={<EventDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('EventDetail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.resetHandlers(); // Reset to default handlers before each test
  });

  afterEach(() => {
    server.resetHandlers(); // Clean up any test-specific overrides
  });

  describe('Loading State', () => {
    it('should show loading skeleton while fetching event', () => {
      server.use(
        http.get(`${API_BASE_URL}/events/:id`, async () => {
          // Delay response to test loading state
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({ data: createMockEvent() });
        })
      );

      renderEventDetail();

      // Check for loading indicators (using common loading patterns)
      expect(screen.getByTestId('event-detail-loading') || document.querySelector('.animate-pulse')).toBeTruthy();
    });
  });

  describe('Event Display', () => {
    it('should display event title and description', async () => {
      const mockEvent = createMockEvent({
        id: 'event-1',
        title: 'Team Lunch Friday',
        description: 'Weekly team lunch gathering',
      });

      server.use(
        http.get(`${API_BASE_URL}/events/event-1`, () => {
          return HttpResponse.json({ data: mockEvent });
        })
      );

      renderEventDetail('event-1');

      await waitFor(() => {
        expect(screen.getByText('Team Lunch Friday')).toBeInTheDocument();
        expect(screen.getByText('Weekly team lunch gathering')).toBeInTheDocument();
      });
    });

    it('should display event status badge', async () => {
      const mockEvent = createMockEvent({
        id: 'event-1',
        status: 'OPEN',
      });

      server.use(
        http.get(`${API_BASE_URL}/events/event-1`, () => {
          return HttpResponse.json({ data: mockEvent });
        })
      );

      renderEventDetail('event-1');

      await waitFor(() => {
        expect(screen.getByText(/open/i)).toBeInTheDocument();
      });
    });

    it('should display order deadline', async () => {
      const deadline = new Date('2025-11-10T12:00:00Z');
      const mockEvent = createMockEvent({
        id: 'event-1',
        orderDeadline: deadline.toISOString(),
      });

      server.use(
        http.get(`${API_BASE_URL}/events/event-1`, () => {
          return HttpResponse.json({ data: mockEvent });
        })
      );

      renderEventDetail('event-1');

      await waitFor(() => {
        // Check that deadline date appears somewhere (format may vary)
        const formattedDate = screen.getByText(/Nov|November/i);
        expect(formattedDate).toBeInTheDocument();
      });
    });

    it('should display delivery location', async () => {
      const mockEvent = createMockEvent({
        id: 'event-1',
        deliveryLocation: 'Main Office - 2nd Floor',
      });

      server.use(
        http.get(`${API_BASE_URL}/events/event-1`, () => {
          return HttpResponse.json({ data: mockEvent });
        })
      );

      renderEventDetail('event-1');

      await waitFor(() => {
        expect(screen.getByText('Main Office - 2nd Floor')).toBeInTheDocument();
      });
    });

    it('should display restaurant information', async () => {
      const mockRestaurant = createMockRestaurant({
        id: 'restaurant-1',
        name: 'Pizza Palace',
        cuisine: 'Italian',
      });

      const mockEvent = createMockEvent({
        id: 'event-1',
        restaurantId: 'restaurant-1',
        restaurant: mockRestaurant,
      });

      server.use(
        http.get(`${API_BASE_URL}/events/event-1`, () => {
          return HttpResponse.json({ data: mockEvent });
        })
      );

      renderEventDetail('event-1');

      await waitFor(() => {
        expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
        expect(screen.getByText(/italian/i)).toBeInTheDocument();
      });
    });
  });

  describe('Participants Section', () => {
    it('should display list of participants', async () => {
      const mockEvent = createMockEvent({
        id: 'event-1',
        participants: [
          {
            id: 'participant-1',
            userId: 'user-1',
            eventId: 'event-1',
            joinedAt: new Date().toISOString(),
            user: createMockUser({ id: 'user-1', name: 'John Doe' }),
          },
          {
            id: 'participant-2',
            userId: 'user-2',
            eventId: 'event-1',
            joinedAt: new Date().toISOString(),
            user: createMockUser({ id: 'user-2', name: 'Jane Smith' }),
          },
        ],
      });

      server.use(
        http.get(`${API_BASE_URL}/events/event-1`, () => {
          return HttpResponse.json({ data: mockEvent });
        })
      );

      renderEventDetail('event-1');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should show participant count', async () => {
      const mockEvent = createMockEvent({
        id: 'event-1',
        participants: [
          {
            id: 'participant-1',
            userId: 'user-1',
            eventId: 'event-1',
            joinedAt: new Date().toISOString(),
            user: createMockUser({ id: 'user-1' }),
          },
          {
            id: 'participant-2',
            userId: 'user-2',
            eventId: 'event-1',
            joinedAt: new Date().toISOString(),
            user: createMockUser({ id: 'user-2' }),
          },
        ],
      });

      server.use(
        http.get(`${API_BASE_URL}/events/event-1`, () => {
          return HttpResponse.json({ data: mockEvent });
        })
      );

      renderEventDetail('event-1');

      await waitFor(() => {
        expect(screen.getByText(/2.*participant/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when event is not found', async () => {
      server.use(
        http.get(`${API_BASE_URL}/events/non-existent`, () => {
          return HttpResponse.json({ message: 'Event not found' }, { status: 404 });
        })
      );

      renderEventDetail('non-existent');

      await waitFor(() => {
        expect(screen.getByText(/not found|error/i)).toBeInTheDocument();
      });
    });

    it('should show back button on error', async () => {
      server.use(
        http.get(`${API_BASE_URL}/events/error-event`, () => {
          return HttpResponse.json({ message: 'Error' }, { status: 500 });
        })
      );

      renderEventDetail('error-event');

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back/i });
        expect(backButton).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should have back button that navigates to events list', async () => {
      const mockEvent = createMockEvent({ id: 'event-1' });

      server.use(
        http.get(`${API_BASE_URL}/events/event-1`, () => {
          return HttpResponse.json({ data: mockEvent });
        })
      );

      renderEventDetail('event-1');

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back/i });
        expect(backButton).toBeInTheDocument();
      });
    });
  });

  describe('Creator Badge', () => {
    it('should show creator badge for event creator', async () => {
      const mockEvent = createMockEvent({
        id: 'event-1',
        createdById: 'user-1',
        createdBy: createMockUser({ id: 'user-1', name: 'Admin User' }),
      });

      server.use(
        http.get(`${API_BASE_URL}/events/event-1`, () => {
          return HttpResponse.json({ data: mockEvent });
        })
      );

      renderEventDetail('event-1');

      await waitFor(() => {
        expect(screen.getByText(/creator|created by/i)).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons - Phase 1', () => {
    describe('Join Event Button', () => {
      it('should show Join Event button when user is not a participant and event is OPEN', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          status: 'OPEN',
          createdById: 'admin-1',
          participants: [],
        });

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /join event/i })).toBeInTheDocument();
        });
      });

      it('should NOT show Join Event button when user is already a participant', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          status: 'OPEN',
          createdById: 'admin-1',
          participants: [
            { id: 'part-1', userId: 'user-1', eventId: 'event-1', user: mockUser, joinedAt: new Date().toISOString() },
          ],
        });

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          expect(screen.queryByRole('button', { name: /join event/i })).not.toBeInTheDocument();
        });
      });

      it('should NOT show Join Event button when event is CLOSED', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          status: 'CLOSED',
          createdById: 'admin-1',
          participants: [],
        });

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          expect(screen.queryByRole('button', { name: /join event/i })).not.toBeInTheDocument();
        });
      });
    });

    describe('Leave Event Button', () => {
      it('should show Leave Event button for participant when event is OPEN', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          status: 'OPEN',
          createdById: 'admin-1',
          participants: [
            { id: 'part-1', userId: 'user-1', eventId: 'event-1', user: mockUser, joinedAt: new Date().toISOString() },
          ],
        });

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /leave event/i })).toBeInTheDocument();
        });
      });

      it('should NOT show Leave Event button when user is the creator', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          status: 'OPEN',
          createdById: 'user-1', // Same as mockUser
          participants: [
            { id: 'part-1', userId: 'user-1', eventId: 'event-1', user: mockUser, joinedAt: new Date().toISOString() },
          ],
        });

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          expect(screen.queryByRole('button', { name: /leave event/i })).not.toBeInTheDocument();
        });
      });
    });

    describe('Close Event Button', () => {
      it('should show Close Event button for creator when event is OPEN', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          status: 'OPEN',
          createdById: 'user-1', // Same as mockUser
          participants: [],
        });

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /close event/i })).toBeInTheDocument();
        });
      });

      it('should NOT show Close Event button for non-creator regular user', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          status: 'OPEN',
          createdById: 'admin-1',
          participants: [],
        });

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          expect(screen.queryByRole('button', { name: /close event/i })).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('Orders Section - Phase 1', () => {
    describe('Admin/Creator View - All Orders', () => {
      it('should show all orders for event creator', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          createdById: 'user-1', // Same as mockUser
          participants: [],
        });

        const mockOrders = [
          createMockOrder({
            id: 'order-1',
            userId: 'user-1',
            eventId: 'event-1',
            totalAmount: 25.50,
            paymentConfirmed: true,
            user: createMockUser({ id: 'user-1', name: 'John Doe', email: 'john@test.com' }),
            orderItems: [
              {
                id: 'item-1',
                orderId: 'order-1',
                menuItemId: 'menu-1',
                quantity: 2,
                price: 12.75,
                menuItem: createMockMenuItem({ id: 'menu-1', name: 'Pizza', price: 12.75 }),
              },
            ],
          }),
          createMockOrder({
            id: 'order-2',
            userId: 'user-2',
            eventId: 'event-1',
            totalAmount: 15.00,
            paymentConfirmed: false,
            user: createMockUser({ id: 'user-2', name: 'Jane Smith', email: 'jane@test.com' }),
            orderItems: [
              {
                id: 'item-2',
                orderId: 'order-2',
                menuItemId: 'menu-2',
                quantity: 1,
                price: 15.00,
                menuItem: createMockMenuItem({ id: 'menu-2', name: 'Pasta', price: 15.00 }),
              },
            ],
          }),
        ];

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          }),
          http.get(`${API_BASE_URL}/events/event-1/orders`, () => {
            return HttpResponse.json({ data: mockOrders });
          })
        );

        renderEventDetail('event-1');

        // Wait for orders to load - wait for actual order content, not just heading
        await waitFor(() => {
          expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        // Should show both orders
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();

        // Should show order totals (prices appear multiple times - in items and total)
        expect(screen.getAllByText(/\$25\.50/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/\$15\.00/).length).toBeGreaterThan(0);

        // Should show payment status
        expect(screen.getByText(/paid/i)).toBeInTheDocument();
        expect(screen.getByText(/pending/i)).toBeInTheDocument();
      });

      // Note: Admin user test would require dynamic mocking of useAuthStore
      // which is complex with vi.mock. The creator test above covers the 
      // "can see all orders" functionality adequately.
    });

    describe('Regular User View - Own Order Only', () => {
      it('should show only own order for regular participant', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          createdById: 'admin-1', // Different from mockUser
          participants: [
            createMockEventParticipant({ userId: 'user-1', eventId: 'event-1' }),
          ],
        });

        const mockOrders = [
          createMockOrder({
            id: 'order-1',
            userId: 'user-1', // Current user's order
            user: createMockUser({ id: 'user-1', name: 'Test User', email: 'test@example.com' }),
            totalAmount: 20.00,
            paymentConfirmed: false,
            orderItems: [
              {
                id: 'item-1',
                orderId: 'order-1',
                menuItemId: 'menu-1',
                quantity: 1,
                price: 20.00,
                menuItem: createMockMenuItem({ id: 'menu-1', name: 'Burger', price: 20.00 }),
              },
            ],
          }),
        ];

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          }),
          http.get(`${API_BASE_URL}/events/event-1/orders`, () => {
            return HttpResponse.json({ data: mockOrders });
          })
        );

        renderEventDetail('event-1');

        // Wait for event to load first
        await waitFor(() => {
          expect(screen.getByText('Team Lunch')).toBeInTheDocument();
        });

        // Wait for the Orders section to finish loading and display order details
        await waitFor(() => {
          expect(screen.getByText('Your Order')).toBeInTheDocument();
          expect(screen.queryByText('Loading orders...')).not.toBeInTheDocument();
          expect(screen.getByText('Test User')).toBeInTheDocument();
          expect(screen.getByText(/1x Burger/)).toBeInTheDocument();
        }, { timeout: 5000 });

        // Verify other order details
        expect(screen.getAllByText(/\$20\.00/).length).toBeGreaterThan(0);
        expect(screen.getByText(/pending/i)).toBeInTheDocument();
      });

      it('should NOT show other users orders to regular participant', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          createdById: 'admin-1',
          participants: [
            createMockEventParticipant({ userId: 'user-1', eventId: 'event-1' }),
          ],
        });

        const mockOrders = [
          createMockOrder({
            id: 'order-1',
            userId: 'user-1',
            user: createMockUser({ id: 'user-1', name: 'Test User', email: 'test@example.com' }),
          }),
          createMockOrder({
            id: 'order-2',
            userId: 'user-2',
            user: createMockUser({ id: 'user-2', name: 'Other User', email: 'other@test.com' }),
          }),
        ];

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          }),
          http.get(`${API_BASE_URL}/events/event-1/orders`, () => {
            return HttpResponse.json({ data: mockOrders });
          })
        );

        renderEventDetail('event-1');

        // Wait for "Your Order" heading to confirm regular user view
        await waitFor(() => {
          expect(screen.getByText('Your Order')).toBeInTheDocument();
        }, { timeout: 2000 });

        // Should NOT show other user's name
        expect(screen.queryByText('Other User')).not.toBeInTheDocument();
      });
    });

    describe('Empty States', () => {
      it('should show empty state when no orders exist', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          createdById: 'user-1',
          participants: [],
        });

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          }),
          http.get(`${API_BASE_URL}/events/event-1/orders`, () => {
            return HttpResponse.json({ data: [] });
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          expect(screen.getByText(/no orders yet/i)).toBeInTheDocument();
        });
      });

      it('should show empty state with call-to-action for participants', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          status: 'OPEN',
          createdById: 'admin-1',
          participants: [
            createMockEventParticipant({ userId: 'user-1', eventId: 'event-1' }),
          ],
        });

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          }),
          http.get(`${API_BASE_URL}/events/event-1/orders`, () => {
            return HttpResponse.json({ data: [] });
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          expect(screen.getByText(/place your order/i)).toBeInTheDocument();
        });
      });
    });

    describe('Order Display and Actions', () => {
      it('should display order items with quantities and prices', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          createdById: 'user-1',
        });

        const mockOrders = [
          createMockOrder({
            id: 'order-1',
            userId: 'user-1',
            user: createMockUser({ id: 'user-1', name: 'Test User', email: 'test@example.com' }),
            totalAmount: 35.50,
            orderItems: [
              {
                id: 'item-1',
                orderId: 'order-1',
                menuItemId: 'menu-1',
                quantity: 2,
                price: 12.00,
                menuItem: createMockMenuItem({ id: 'menu-1', name: 'Pizza', price: 12.00 }),
              },
              {
                id: 'item-2',
                orderId: 'order-1',
                menuItemId: 'menu-2',
                quantity: 1,
                price: 11.50,
                menuItem: createMockMenuItem({ id: 'menu-2', name: 'Salad', price: 11.50 }),
              },
            ],
          }),
        ];

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          }),
          http.get(`${API_BASE_URL}/events/event-1/orders`, () => {
            return HttpResponse.json({ data: mockOrders });
          })
        );

        renderEventDetail('event-1');

        // Wait for event to load first
        await waitFor(() => {
          expect(screen.getByText('Team Lunch')).toBeInTheDocument();
        });

        // Wait for Orders section to finish loading and display order details
        await waitFor(() => {
          expect(screen.getByText('Orders')).toBeInTheDocument();
          expect(screen.queryByText('Loading orders...')).not.toBeInTheDocument();
          expect(screen.getByText('Test User')).toBeInTheDocument();
          expect(screen.getByText(/2x Pizza/)).toBeInTheDocument();
        }, { timeout: 5000 });

        // Verify all order item details are present
        expect(screen.getByText(/1x Salad/)).toBeInTheDocument();

        // Check total
        expect(screen.getAllByText(/\$35\.50/).length).toBeGreaterThan(0);
      });

      it('should show Edit button for own order when event is OPEN', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          status: 'OPEN',
          createdById: 'admin-1',
          participants: [
            createMockEventParticipant({ userId: 'user-1', eventId: 'event-1' }),
          ],
        });

        const mockOrders = [
          createMockOrder({
            id: 'order-1',
            userId: 'user-1',
            user: createMockUser({ id: 'user-1', name: 'Test User', email: 'test@example.com' }),
          }),
        ];

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          }),
          http.get(`${API_BASE_URL}/events/event-1/orders`, () => {
            return HttpResponse.json({ data: mockOrders });
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /edit order/i })).toBeInTheDocument();
        });
      });

      it('should NOT show Edit button when event is CLOSED', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          status: 'CLOSED',
          createdById: 'admin-1',
          participants: [
            createMockEventParticipant({ userId: 'user-1', eventId: 'event-1' }),
          ],
        });

        const mockOrders = [
          createMockOrder({
            id: 'order-1',
            userId: 'user-1',
            user: createMockUser({ id: 'user-1', name: 'Test User', email: 'test@example.com' }),
          }),
        ];

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          }),
          http.get(`${API_BASE_URL}/events/event-1/orders`, () => {
            return HttpResponse.json({ data: mockOrders });
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          expect(screen.queryByRole('button', { name: /edit order/i })).not.toBeInTheDocument();
        });
      });

      it('should show payment confirmation badges', async () => {
        const mockEvent = createMockEvent({
          id: 'event-1',
          createdById: 'user-1',
        });

        const mockOrders = [
          createMockOrder({
            id: 'order-1',
            userId: 'user-1',
            user: createMockUser({ id: 'user-1', name: 'Test User', email: 'test@example.com' }),
            paymentConfirmed: true,
          }),
        ];

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          }),
          http.get(`${API_BASE_URL}/events/event-1/orders`, () => {
            return HttpResponse.json({ data: mockOrders });
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          const paidBadge = screen.getByText(/paid/i);
          expect(paidBadge).toBeInTheDocument();
          expect(paidBadge).toHaveClass('bg-green-100'); // Or whatever styling indicates paid
        });
      });
    });

    describe('Loading and Error States', () => {
      it('should show loading state while fetching orders', async () => {
        const mockEvent = createMockEvent({ id: 'event-1', createdById: 'user-1' });

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          }),
          http.get(`${API_BASE_URL}/events/event-1/orders`, async () => {
            // Delay response to test loading state
            await new Promise(resolve => setTimeout(resolve, 100));
            return HttpResponse.json({ data: [] });
          })
        );

        renderEventDetail('event-1');

        // Wait for event to load first, then check for orders loading
        await waitFor(() => {
          expect(screen.getByText('Team Lunch')).toBeInTheDocument();
        });

        // Should show loading indicator for orders
        expect(screen.getByText(/loading orders/i)).toBeInTheDocument();

        // Wait for orders to finish loading
        await waitFor(() => {
          expect(screen.queryByText(/loading orders/i)).not.toBeInTheDocument();
        });
      });

      it('should handle orders fetch error gracefully', async () => {
        const mockEvent = createMockEvent({ id: 'event-1' });

        server.use(
          http.get(`${API_BASE_URL}/events/event-1`, () => {
            return HttpResponse.json({ data: mockEvent });
          }),
          http.get(`${API_BASE_URL}/events/event-1/orders`, () => {
            return HttpResponse.json(
              { message: 'Failed to fetch orders' },
              { status: 500 }
            );
          })
        );

        renderEventDetail('event-1');

        await waitFor(() => {
          expect(screen.getByText(/failed to load orders/i)).toBeInTheDocument();
        });
      });
    });
  });
});

