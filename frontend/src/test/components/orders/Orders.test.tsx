import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../utils/test-utils';
import Orders from '@/pages/Orders';
import { createMockOrder, createMockEvent, createMockRestaurant } from '../../utils/factories';
import type { Order } from '@/types';

// Helper type for orders with populated event data
interface OrderWithEvent extends Order {
  event?: {
    id: string;
    title: string;
    status: string;
    orderDeadline: string;
    deliveryLocation: string;
    restaurant?: {
      name: string;
    };
  };
}

// Helper factory to create orders with event data
const createMockOrderWithEvent = (orderOverrides?: Partial<Order>, eventOverrides?: Partial<any>): OrderWithEvent => {
  const event = eventOverrides ? createMockEvent(eventOverrides) : undefined;
  const order = createMockOrder(orderOverrides);
  return {
    ...order,
    ...(event && { event }),
  } as OrderWithEvent;
};

// Mock API hooks
vi.mock('@/lib/api/hooks', () => ({
  useUserOrders: vi.fn(),
  useCancelOrder: vi.fn(),
}));

describe('Orders - Rendering & Structure', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset to default empty state
    const { useUserOrders, useCancelOrder } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    vi.mocked(useCancelOrder).mockReturnValue({
      mutate: vi.fn(),
    } as any);
  });

  it('should render page title', () => {
    render(<Orders />);

    expect(screen.getByRole('heading', { name: /my orders/i })).toBeInTheDocument();
  });

  it('should display total order count', async () => {
    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [createMockOrder(), createMockOrder({ id: 'order-2' })],
      isLoading: false,
    } as any);

    render(<Orders />);

    expect(screen.getByText(/total orders:/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render empty state when no orders exist', () => {
    render(<Orders />);

    expect(screen.getByText(/no orders yet/i)).toBeInTheDocument();
    expect(screen.getByText(/join an event and place your first order/i)).toBeInTheDocument();
  });

  it('should display loading skeleton while fetching orders', async () => {
    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [],
      isLoading: true,
    } as any);

    render(<Orders />);

    // Check for loading skeleton cards
    expect(screen.getByRole('heading', { name: /my orders/i })).toBeInTheDocument();
    const cards = document.querySelectorAll('.animate-pulse');
    expect(cards.length).toBeGreaterThan(0);
  });
});

describe('Orders - Order Display', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useUserOrders, useCancelOrder } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    vi.mocked(useCancelOrder).mockReturnValue({
      mutate: vi.fn(),
    } as any);
  });

  it('should display order with event details', async () => {
    const mockOrder = createMockOrderWithEvent(
      { id: 'order-1' },
      {
        title: 'Team Pizza Lunch',
        status: 'OPEN',
        restaurant: createMockRestaurant({ name: 'Pizza Palace' }),
      }
    );

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    expect(screen.getByText('Team Pizza Lunch')).toBeInTheDocument();
    expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
  });

  it('should display event status badge with correct color - OPEN', async () => {
    const mockOrder = createMockOrderWithEvent({}, { status: 'OPEN' });

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    const badge = screen.getByText('OPEN');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-500');
  });

  it('should display event status badge with correct color - CLOSED', async () => {
    const mockOrder = createMockOrderWithEvent({}, { status: 'CLOSED' });

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    const badge = screen.getByText('CLOSED');
    expect(badge).toHaveClass('bg-yellow-500');
  });

  it('should display event status badge with correct color - COMPLETED', async () => {
    const mockOrder = createMockOrderWithEvent({}, { status: 'COMPLETED' });

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    const badge = screen.getByText('COMPLETED');
    expect(badge).toHaveClass('bg-blue-500');
  });

  it('should display event status badge with correct color - CANCELLED', async () => {
    const mockOrder = createMockOrderWithEvent({}, { status: 'CANCELLED' });

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    const badge = screen.getByText('CANCELLED');
    expect(badge).toHaveClass('bg-red-500');
  });

  it('should display formatted order deadline', async () => {
    const mockOrder = createMockOrderWithEvent(
      {},
      { orderDeadline: '2025-10-20T14:30:00.000Z' }
    );

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    // date-fns format should display the deadline (MMM d, h:mm a)
    // Check for Oct 20 (flexible about time due to timezone differences)
    expect(screen.getByText(/Oct 20/i)).toBeInTheDocument();
  });

  it('should display delivery location', async () => {
    const mockOrder = createMockOrderWithEvent(
      {},
      { deliveryLocation: 'Conference Room A' }
    );

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    expect(screen.getByText(/Conference Room A/i)).toBeInTheDocument();
  });

  it('should display order total amount', async () => {
    const mockOrder = createMockOrder({
      totalAmount: 25.50,
    });

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    expect(screen.getByText(/\$25\.50/)).toBeInTheDocument();
  });

  it('should display payment confirmed status when paymentConfirmed is true', async () => {
    const mockOrder = createMockOrderWithEvent({
      paymentConfirmed: true,
    }, {});

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    expect(screen.getByText(/paid/i)).toBeInTheDocument();
  });

  it('should NOT display paid badge when paymentConfirmed is false', async () => {
    const mockOrder = createMockOrderWithEvent({
      paymentConfirmed: false,
    }, {});

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    expect(screen.queryByText(/paid/i)).not.toBeInTheDocument();
  });
});

describe('Orders - Order Actions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useUserOrders, useCancelOrder } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    vi.mocked(useCancelOrder).mockReturnValue({
      mutate: vi.fn(),
    } as any);
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show cancel button when event status is OPEN', async () => {
    const mockOrder = createMockOrderWithEvent({}, { status: 'OPEN' });

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument();
  });

  it('should NOT show cancel button when event status is CLOSED', async () => {
    const mockOrder = createMockOrderWithEvent({}, { status: 'CLOSED' });

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    expect(screen.queryByRole('button', { name: /cancel order/i })).not.toBeInTheDocument();
  });

  it('should call cancelOrder mutation when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOrder = createMockOrderWithEvent(
      { id: 'order-1', eventId: 'event-1' },
      { status: 'OPEN', id: 'event-1' }
    );
    const mockCancelFn = vi.fn();

    const { useUserOrders, useCancelOrder } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);
    vi.mocked(useCancelOrder).mockReturnValue({
      mutate: mockCancelFn,
    } as any);

    render(<Orders />);

    const cancelButton = screen.getByRole('button', { name: /cancel order/i });
    await user.click(cancelButton);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to cancel this order?');
    expect(mockCancelFn).toHaveBeenCalledWith({
      eventId: 'event-1',
      orderId: 'order-1',
    });
  });

  it('should NOT call cancelOrder when user cancels confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockImplementation(() => false);
    
    const mockOrder = createMockOrderWithEvent({}, { status: 'OPEN' });
    const mockCancelFn = vi.fn();

    const { useUserOrders, useCancelOrder } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);
    vi.mocked(useCancelOrder).mockReturnValue({
      mutate: mockCancelFn,
    } as any);

    render(<Orders />);

    const cancelButton = screen.getByRole('button', { name: /cancel order/i });
    await user.click(cancelButton);

    expect(mockCancelFn).not.toHaveBeenCalled();
  });

  it('should show view details button for each order', async () => {
    const mockOrder = createMockOrder();

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
  });

  it('should open order details modal when view details is clicked', async () => {
    const user = userEvent.setup();
    const mockOrder = createMockOrderWithEvent({}, {});

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    const viewButton = screen.getByRole('button', { name: /view details/i });
    await user.click(viewButton);

    // Modal should open - check for "Order Details" heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /order details/i })).toBeInTheDocument();
    });
  });

  it('should close order details modal when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOrder = createMockOrderWithEvent({}, {});

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    // Open modal
    const viewButton = screen.getByRole('button', { name: /view details/i });
    await user.click(viewButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /order details/i })).toBeInTheDocument();
    });

    // Close modal - use getAllByRole since there are multiple buttons
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    const modalCloseButton = closeButtons[closeButtons.length - 1]; // Get the last one (in modal)
    await user.click(modalCloseButton);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /order details/i })).not.toBeInTheDocument();
    });
  });
});

describe('Orders - Multiple Orders', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useUserOrders, useCancelOrder } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    vi.mocked(useCancelOrder).mockReturnValue({
      mutate: vi.fn(),
    } as any);
  });

  it('should display multiple orders in a list', async () => {
    const mockOrders = [
      createMockOrderWithEvent(
        { id: 'order-1' },
        { title: 'Lunch Event 1' }
      ),
      createMockOrderWithEvent(
        { id: 'order-2' },
        { title: 'Lunch Event 2' }
      ),
      createMockOrderWithEvent(
        { id: 'order-3' },
        { title: 'Lunch Event 3' }
      ),
    ];

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: mockOrders,
      isLoading: false,
    } as any);

    render(<Orders />);

    expect(screen.getByText('Lunch Event 1')).toBeInTheDocument();
    expect(screen.getByText('Lunch Event 2')).toBeInTheDocument();
    expect(screen.getByText('Lunch Event 3')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Total count
  });

  it('should render each order in its own card', async () => {
    const mockOrders = [
      createMockOrder({ id: 'order-1' }),
      createMockOrder({ id: 'order-2' }),
    ];

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: mockOrders,
      isLoading: false,
    } as any);

    render(<Orders />);

    // Check that there are multiple order cards
    const cards = screen.getAllByRole('button', { name: /view details/i });
    expect(cards).toHaveLength(2);
  });
});

describe('Orders - Accessibility', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useUserOrders, useCancelOrder } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    vi.mocked(useCancelOrder).mockReturnValue({
      mutate: vi.fn(),
    } as any);
  });

  it('should have proper heading hierarchy', async () => {
    const mockOrder = createMockOrder();

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    const heading = screen.getByRole('heading', { level: 1, name: /my orders/i });
    expect(heading).toBeInTheDocument();
  });

  it('should have descriptive button labels', async () => {
    const mockOrder = createMockOrderWithEvent({}, { status: 'OPEN' });

    const { useUserOrders } = await import('@/lib/api/hooks');
    vi.mocked(useUserOrders).mockReturnValue({
      data: [mockOrder],
      isLoading: false,
    } as any);

    render(<Orders />);

    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel order/i })).toBeInTheDocument();
  });

  it('should have accessible empty state', () => {
    render(<Orders />);

    // Empty state should have descriptive text
    expect(screen.getByText(/no orders yet/i)).toBeInTheDocument();
    expect(screen.getByText(/join an event and place your first order/i)).toBeInTheDocument();
  });
});
