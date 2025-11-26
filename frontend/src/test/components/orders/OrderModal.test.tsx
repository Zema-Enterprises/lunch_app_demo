import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../utils/test-utils';
import { OrderModal } from '@/components/features/OrderModal';
import { createMockEvent, createMockRestaurant, createMockMenuItem } from '../../utils/factories';

// Mock API hooks
vi.mock('@/lib/api/hooks', () => ({
  useCreateOrder: vi.fn(),
  useMenuItems: vi.fn(),
  useCompanyTheme: vi.fn(() => ({ data: null, isLoading: false })),
  useUpdateCompanyTheme: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUploadThemeCover: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

describe('OrderModal - Rendering & Structure', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useCreateOrder, useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useCreateOrder).mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);
    vi.mocked(useMenuItems).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  it('should render modal with event title and restaurant name', () => {
    const mockEvent = createMockEvent({
      title: 'Team Lunch',
      restaurant: createMockRestaurant({ name: 'Pizza Palace' }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    expect(screen.getByText('Team Lunch')).toBeInTheDocument();
    expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
  });

  it('should render close button', () => {
    const mockEvent = createMockEvent();

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    const closeButtons = screen.getAllByRole('button');
    expect(closeButtons.some(btn => btn.querySelector('svg'))).toBe(true); // X icon button
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent();
    const onClose = vi.fn();

    render(<OrderModal event={mockEvent} onClose={onClose} />);

    // Find the X button (first button with icon)
    const closeButton = screen.getAllByRole('button')[0];
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent();
    const onClose = vi.fn();

    const { container } = render(<OrderModal event={mockEvent} onClose={onClose} />);

    // Click the backdrop (first div with bg-black/50)
    const backdrop = container.querySelector('.bg-black\\/50');
    if (backdrop) {
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should display participants section', () => {
    const mockEvent = createMockEvent({
      participants: [
        { 
          id: '1', 
          userId: '1', 
          eventId: 'event-1', 
          joinedAt: '2025-10-06T12:00:00.000Z',
          user: { id: '1', name: 'John Doe', email: 'john@example.com', role: 'USER', companyId: 'company-1' } 
        },
        { 
          id: '2', 
          userId: '2', 
          eventId: 'event-1', 
          joinedAt: '2025-10-06T12:00:00.000Z',
          user: { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'USER', companyId: 'company-1' } 
        },
      ],
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    expect(screen.getByText(/participants \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });
});

describe('OrderModal - Menu-Based Orders', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useCreateOrder, useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useCreateOrder).mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);
    vi.mocked(useMenuItems).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  it('should display menu items when restaurant has menu', async () => {
    const mockMenuItems = [
      createMockMenuItem({ id: '1', name: 'Margherita Pizza', price: 12.99, category: 'Pizza' }),
      createMockMenuItem({ id: '2', name: 'Caesar Salad', price: 8.99, category: 'Salads' }),
    ];

    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    const { useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useMenuItems).mockReturnValue({
      data: mockMenuItems,
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    expect(screen.getByText('$12.99')).toBeInTheDocument();
    expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
    expect(screen.getByText('$8.99')).toBeInTheDocument();
  });

  it('should group menu items by category', async () => {
    const mockMenuItems = [
      createMockMenuItem({ id: '1', name: 'Pizza 1', category: 'Pizza' }),
      createMockMenuItem({ id: '2', name: 'Pizza 2', category: 'Pizza' }),
      createMockMenuItem({ id: '3', name: 'Salad 1', category: 'Salads' }),
    ];

    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    const { useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useMenuItems).mockReturnValue({
      data: mockMenuItems,
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    expect(screen.getByText('Pizza')).toBeInTheDocument();
    expect(screen.getByText('Salads')).toBeInTheDocument();
  });

  it('should show empty order state initially', () => {
    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    expect(screen.getByText('Your Order')).toBeInTheDocument();
    expect(screen.getByText('No items added yet')).toBeInTheDocument();
  });

  it('should add menu item to order when plus button is clicked', async () => {
    const user = userEvent.setup();
    const mockMenuItems = [
      createMockMenuItem({ id: '1', name: 'Margherita Pizza', price: 12.99 }),
    ];

    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    const { useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useMenuItems).mockReturnValue({
      data: mockMenuItems,
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    // Click the plus button to add item
    const addButtons = screen.getAllByRole('button');
    const plusButton = addButtons.find(btn => btn.querySelector('svg')?.classList.contains('lucide-plus'));
    if (plusButton) {
      await user.click(plusButton);
    }

    // Item should appear in "Your Order" section
    await waitFor(() => {
      expect(screen.queryByText('No items added yet')).not.toBeInTheDocument();
    });
  });

  it('should increase quantity when adding same item multiple times', async () => {
    const user = userEvent.setup();
    const mockMenuItems = [
      createMockMenuItem({ id: '1', name: 'Margherita Pizza', price: 12.99 }),
    ];

    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    const { useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useMenuItems).mockReturnValue({
      data: mockMenuItems,
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    // Click add button twice
    const addButtons = screen.getAllByRole('button');
    const plusButton = addButtons.find(btn => btn.querySelector('svg')?.classList.contains('lucide-plus'));
    
    if (plusButton) {
      await user.click(plusButton);
      await user.click(plusButton);
    }

    // Should show quantity of 2
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('should calculate total amount correctly', async () => {
    const user = userEvent.setup();
    const mockMenuItems = [
      createMockMenuItem({ id: '1', name: 'Pizza', price: 12.00 }),
      createMockMenuItem({ id: '2', name: 'Salad', price: 8.00 }),
    ];

    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    const { useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useMenuItems).mockReturnValue({
      data: mockMenuItems,
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    // Add both items
    const addButtons = screen.getAllByRole('button');
    const plusButtons = addButtons.filter(btn => btn.querySelector('svg')?.classList.contains('lucide-plus'));
    
    if (plusButtons[0]) await user.click(plusButtons[0]); // Add Pizza
    if (plusButtons[1]) await user.click(plusButtons[1]); // Add Salad

    // Total should be $20.00
    await waitFor(() => {
      expect(screen.getByText('$20.00')).toBeInTheDocument();
    });
  });

  it('should disable Place Order button when cart is empty', () => {
    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    expect(placeOrderButton).toBeDisabled();
  });

  it('should enable Place Order button when items are added', async () => {
    const user = userEvent.setup();
    const mockMenuItems = [
      createMockMenuItem({ id: '1', name: 'Pizza', price: 12.99 }),
    ];

    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    const { useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useMenuItems).mockReturnValue({
      data: mockMenuItems,
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    const addButtons = screen.getAllByRole('button');
    const plusButton = addButtons.find(btn => btn.querySelector('svg')?.classList.contains('lucide-plus'));
    
    if (plusButton) {
      await user.click(plusButton);
    }

    await waitFor(() => {
      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      expect(placeOrderButton).not.toBeDisabled();
    });
  });
});

describe('OrderModal - Quantity Management', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useCreateOrder } = await import('@/lib/api/hooks');
    vi.mocked(useCreateOrder).mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);
  });

  it('should increase quantity when plus button is clicked', async () => {
    const user = userEvent.setup();
    const mockMenuItems = [
      createMockMenuItem({ id: '1', name: 'Pizza', price: 12.99 }),
    ];

    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    const { useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useMenuItems).mockReturnValue({
      data: mockMenuItems,
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    // Add item first
    const addButtons = screen.getAllByRole('button');
    const addButton = addButtons.find(btn => btn.querySelector('.lucide-plus'));
    if (addButton) await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Click the increment button in the cart
    const incrementButtons = screen.getAllByRole('button');
    const incrementButton = incrementButtons.filter(btn => btn.querySelector('.lucide-plus'))[1]; // Second plus button
    if (incrementButton) {
      await user.click(incrementButton);
    }

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('should decrease quantity when minus button is clicked', async () => {
    const user = userEvent.setup();
    const mockMenuItems = [
      createMockMenuItem({ id: '1', name: 'Pizza', price: 12.99 }),
    ];

    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    const { useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useMenuItems).mockReturnValue({
      data: mockMenuItems,
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    // Add item twice
    const addButtons = screen.getAllByRole('button');
    const addButton = addButtons.find(btn => btn.querySelector('.lucide-plus'));
    if (addButton) {
      await user.click(addButton);
      await user.click(addButton);
    }

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    // Click the decrement button
    const minusButton = Array.from(screen.getAllByRole('button')).find(btn => 
      btn.querySelector('.lucide-minus')
    );
    
    if (minusButton) {
      await user.click(minusButton);
    }

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('should remove item when quantity reaches zero', async () => {
    const user = userEvent.setup();
    const mockMenuItems = [
      createMockMenuItem({ id: '1', name: 'Pizza', price: 12.99 }),
    ];

    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    const { useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useMenuItems).mockReturnValue({
      data: mockMenuItems,
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    // Add item once
    const addButtons = screen.getAllByRole('button');
    const addButton = addButtons.find(btn => btn.querySelector('.lucide-plus'));
    if (addButton) {
      await user.click(addButton);
    }

    await waitFor(() => {
      expect(screen.queryByText('No items added yet')).not.toBeInTheDocument();
    });

    // Decrease to zero
    const minusButton = Array.from(screen.getAllByRole('button')).find(btn => 
      btn.querySelector('.lucide-minus')
    );
    
    if (minusButton) {
      await user.click(minusButton);
    }

    // Should return to empty state
    await waitFor(() => {
      expect(screen.getByText('No items added yet')).toBeInTheDocument();
    });
  });
});

describe('OrderModal - Custom Orders', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useCreateOrder, useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useCreateOrder).mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);
    vi.mocked(useMenuItems).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  it('should show custom order textarea when restaurant has no menu', () => {
    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: false }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    expect(screen.getByLabelText(/your order/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe what you'd like to order/i)).toBeInTheDocument();
  });

  it('should allow typing in custom order field', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: false }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    const customOrderField = screen.getByLabelText(/your order/i);
    await user.type(customOrderField, 'Large pepperoni pizza with extra cheese');

    expect(customOrderField).toHaveValue('Large pepperoni pizza with extra cheese');
  });

  it('should NOT disable Place Order button for custom orders', () => {
    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: false }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    expect(placeOrderButton).not.toBeDisabled();
  });
});

describe('OrderModal - Special Instructions', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useCreateOrder, useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useCreateOrder).mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);
    vi.mocked(useMenuItems).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  it('should display special instructions field for menu orders', () => {
    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    expect(screen.getByLabelText(/special instructions/i)).toBeInTheDocument();
  });

  it('should display special instructions field for custom orders', () => {
    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: false }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    expect(screen.getByLabelText(/special instructions/i)).toBeInTheDocument();
  });

  it('should allow typing in special instructions field', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    const notesField = screen.getByLabelText(/special instructions/i);
    await user.type(notesField, 'No onions please');

    expect(notesField).toHaveValue('No onions please');
  });
});

describe('OrderModal - Order Submission', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it('should call createOrder with correct data for menu-based order', async () => {
    const user = userEvent.setup();
    const mockCreateOrder = vi.fn().mockResolvedValue({});
    const mockMenuItems = [
      createMockMenuItem({ id: '1', name: 'Pizza', price: 12.99 }),
    ];

    const mockEvent = createMockEvent({
      id: 'event-1',
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    const { useCreateOrder, useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useCreateOrder).mockReturnValue({
      mutateAsync: mockCreateOrder,
    } as any);
    vi.mocked(useMenuItems).mockReturnValue({
      data: mockMenuItems,
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    // Add item
    const addButtons = screen.getAllByRole('button');
    const addButton = addButtons.find(btn => btn.querySelector('.lucide-plus'));
    if (addButton) await user.click(addButton);

    await waitFor(() => {
      expect(screen.queryByText('No items added yet')).not.toBeInTheDocument();
    });

    // Submit order
    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    await user.click(placeOrderButton);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith({
        eventId: 'event-1',
        orderItems: [
          {
            menuItemId: '1',
            quantity: 1,
            price: 12.99,
          },
        ],
        notes: '',
        totalAmount: 12.99,
      });
    });
  });

  it('should call createOrder with correct data for custom order', async () => {
    const user = userEvent.setup();
    const mockCreateOrder = vi.fn().mockResolvedValue({});

    const mockEvent = createMockEvent({
      id: 'event-1',
      restaurant: createMockRestaurant({ hasMenu: false }),
    });

    const { useCreateOrder, useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useCreateOrder).mockReturnValue({
      mutateAsync: mockCreateOrder,
    } as any);
    vi.mocked(useMenuItems).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    // Type custom order
    const customOrderField = screen.getByLabelText(/your order/i);
    await user.type(customOrderField, 'Large pepperoni pizza');

    // Submit order
    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    await user.click(placeOrderButton);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith({
        eventId: 'event-1',
        customOrder: 'Large pepperoni pizza',
        notes: '',
        totalAmount: 0,
      });
    });
  });

  it('should include notes in order submission', async () => {
    const user = userEvent.setup();
    const mockCreateOrder = vi.fn().mockResolvedValue({});

    const mockEvent = createMockEvent({
      id: 'event-1',
      restaurant: createMockRestaurant({ hasMenu: false }),
    });

    const { useCreateOrder, useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useCreateOrder).mockReturnValue({
      mutateAsync: mockCreateOrder,
    } as any);
    vi.mocked(useMenuItems).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    // Type custom order and notes
    const customOrderField = screen.getByLabelText(/your order/i);
    await user.type(customOrderField, 'Pizza');

    const notesField = screen.getByLabelText(/special instructions/i);
    await user.type(notesField, 'No onions');

    // Submit order
    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    await user.click(placeOrderButton);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'No onions',
        })
      );
    });
  });

  it('should close modal after successful order submission', async () => {
    const user = userEvent.setup();
    const mockCreateOrder = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();

    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: false }),
    });

    const { useCreateOrder, useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useCreateOrder).mockReturnValue({
      mutateAsync: mockCreateOrder,
    } as any);
    vi.mocked(useMenuItems).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={onClose} />);

    // Type and submit
    const customOrderField = screen.getByLabelText(/your order/i);
    await user.type(customOrderField, 'Pizza');

    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    await user.click(placeOrderButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle order submission error gracefully', async () => {
    const user = userEvent.setup();
    const mockCreateOrder = vi.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: false }),
    });

    const { useCreateOrder, useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useCreateOrder).mockReturnValue({
      mutateAsync: mockCreateOrder,
    } as any);
    vi.mocked(useMenuItems).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    // Type and submit
    const customOrderField = screen.getByLabelText(/your order/i);
    await user.type(customOrderField, 'Pizza');

    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    await user.click(placeOrderButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});

describe('OrderModal - Accessibility', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useCreateOrder, useMenuItems } = await import('@/lib/api/hooks');
    vi.mocked(useCreateOrder).mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);
    vi.mocked(useMenuItems).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  it('should have proper heading hierarchy', () => {
    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2).toBeInTheDocument();

    const h3Headings = screen.getAllByRole('heading', { level: 3 });
    expect(h3Headings.length).toBeGreaterThan(0);
  });

  it('should have labeled form fields', () => {
    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: false }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    expect(screen.getByLabelText(/your order/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/special instructions/i)).toBeInTheDocument();
  });

  it('should have accessible buttons', () => {
    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
  });

  it('should have proper button states', () => {
    const mockEvent = createMockEvent({
      restaurant: createMockRestaurant({ hasMenu: true }),
    });

    render(<OrderModal event={mockEvent} onClose={vi.fn()} />);

    const placeOrderButton = screen.getByRole('button', { name: /place order/i });
    expect(placeOrderButton).toBeDisabled();
  });
});
