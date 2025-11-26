import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils/test-utils';
import { EventDetailsModal } from '@/components/events/EventDetailsModal';
import { createMockEvent, createMockEventParticipant, createMockUser, createMockRestaurant } from '../utils/factories';

// Mock API hooks
vi.mock('@/lib/api/hooks', () => ({
  useEvent: vi.fn(() => ({ data: null, isLoading: false })),
  useUpdateEvent: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRestaurants: vi.fn(() => ({ data: [], isLoading: false })),
  useCompanyTheme: vi.fn(() => ({ data: null, isLoading: false })),
  useUpdateCompanyTheme: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUploadThemeCover: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

// Mock accessibility hooks
vi.mock('@/hooks/useAccessibility', () => ({
  useFocusTrap: vi.fn(() => ({ current: null })),
  useEscapeKey: vi.fn(),
}));

describe('EventDetailsModal - Rendering & Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal with dialog role and proper aria attributes', () => {
    const mockEvent = createMockEvent({ title: 'Team Lunch Event' });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'event-modal-title');
  });

  it('should render event title and description', () => {
    const mockEvent = createMockEvent({
      title: 'Team Lunch Event',
      description: 'Monthly team gathering',
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByRole('heading', { name: 'Team Lunch Event' })).toBeInTheDocument();
    expect(screen.getByText('Monthly team gathering')).toBeInTheDocument();
  });

  it('should render without description when description is null', () => {
    const mockEvent = createMockEvent({
      title: 'Team Lunch Event',
      description: undefined,
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByRole('heading', { name: 'Team Lunch Event' })).toBeInTheDocument();
    // Description should not be present
    expect(screen.queryByText(/Monthly team gathering/i)).not.toBeInTheDocument();
  });

  it('should render close buttons in header and footer', () => {
    const mockEvent = createMockEvent();
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    // Header X button (aria-label="Close dialog")
    expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument();
    
    // Footer close button
    expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument();
  });

  it('should render all section headings', () => {
    const mockEvent = createMockEvent({
      participants: [createMockEventParticipant()],
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByRole('heading', { name: /event details/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /order summary/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /participants/i })).toBeInTheDocument();
  });
});

describe('EventDetailsModal - Event Details Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display restaurant name and cuisine', () => {
    const mockRestaurant = createMockRestaurant({
      name: 'Pizza Palace',
      cuisine: 'Italian',
    });
    const mockEvent = createMockEvent({
      restaurant: mockRestaurant,
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
    expect(screen.getByText(/Italian/)).toBeInTheDocument();
  });

  it('should display N/A when restaurant is missing', () => {
    const mockEvent = createMockEvent({
      restaurant: undefined,
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('should display delivery location', () => {
    const mockEvent = createMockEvent({
      deliveryLocation: 'Conference Room A',
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText(/Delivery Location/i)).toBeInTheDocument();
    expect(screen.getByText(/Conference Room A/i)).toBeInTheDocument();
  });

  it('should display formatted order deadline', () => {
    const mockEvent = createMockEvent({
      orderDeadline: '2025-10-20T14:30:00.000Z',
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText(/Order Deadline/i)).toBeInTheDocument();
    // date-fns format: "MMM d, yyyy • h:mm a"
    expect(screen.getByText(/Oct 20, 2025/i)).toBeInTheDocument();
  });

  it('should display payment method with proper label - EVENT_CREATOR', () => {
    const mockEvent = createMockEvent({
      paymentMethod: 'EVENT_CREATOR',
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText(/Payment Method/i)).toBeInTheDocument();
    expect(screen.getByText(/Creator Pays/i)).toBeInTheDocument();
  });

  it('should display payment method with proper label - INDIVIDUAL', () => {
    const mockEvent = createMockEvent({
      paymentMethod: 'INDIVIDUAL',
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText(/Individual/i)).toBeInTheDocument();
  });

  it('should display payment method with proper label - COMPANY_EXPENSE', () => {
    const mockEvent = createMockEvent({
      paymentMethod: 'COMPANY_EXPENSE',
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText(/Company Expense/i)).toBeInTheDocument();
  });

  it('should display participant count', () => {
    const mockEvent = createMockEvent({
      participants: [
        createMockEventParticipant(),
        createMockEventParticipant({ id: 'participant-2' }),
      ],
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    // Check for the specific participant count text (more specific than just "Participants")
    expect(screen.getByText(/2 participant\(s\)/i)).toBeInTheDocument();
  });

  it('should display zero participants when none exist', () => {
    const mockEvent = createMockEvent({
      participants: [],
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText(/0 participant\(s\)/i)).toBeInTheDocument();
  });

  it('should display event creator name', () => {
    const mockUser = createMockUser({ name: 'John Doe' });
    const mockEvent = createMockEvent({
      createdBy: mockUser,
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText(/Created By/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
  });

  it('should display Unknown when creator is missing', () => {
    const mockEvent = createMockEvent({
      createdBy: undefined,
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText(/Unknown/i)).toBeInTheDocument();
  });
});

describe('EventDetailsModal - Status Badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display OPEN status badge', () => {
    const mockEvent = createMockEvent({ status: 'OPEN' });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    const badge = screen.getByText('OPEN');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-500');
  });

  it('should display CLOSED status badge', () => {
    const mockEvent = createMockEvent({ status: 'CLOSED' });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    const badge = screen.getByText('CLOSED');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-yellow-500');
  });

  it('should display COMPLETED status badge', () => {
    const mockEvent = createMockEvent({ status: 'COMPLETED' });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    const badge = screen.getByText('COMPLETED');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-blue-500');
  });

  it('should display CANCELLED status badge', () => {
    const mockEvent = createMockEvent({ status: 'CANCELLED' });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    const badge = screen.getByText('CANCELLED');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-red-500');
  });
});

describe('EventDetailsModal - Order Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state while fetching full event data', async () => {
    const { useEvent } = await import('@/lib/api/hooks');
    vi.mocked(useEvent).mockReturnValue({
      data: null,
      isLoading: true,
    } as any);

    const mockEvent = createMockEvent();
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText(/Loading order data.../i)).toBeInTheDocument();
  });

  it('should display order summary when orders exist', async () => {
    const mockEvent = createMockEvent({
      id: 'event-1',
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    // Wait for the full event data to load (which includes orders from MSW)
    await waitFor(() => {
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });
  });

  it('should display empty state when no orders exist', () => {
    const mockEvent = createMockEvent({
      orders: [],
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    // Component shows "No orders yet" in the bottom section even when loading
    expect(screen.getByText(/No orders yet/i)).toBeInTheDocument();
  });

  it('should show different empty state message based on event status - OPEN', () => {
    const mockEvent = createMockEvent({
      status: 'OPEN',
      orders: [],
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText(/Orders will appear here once participants start ordering/i)).toBeInTheDocument();
  });

  it('should show different empty state message based on event status - CLOSED', () => {
    const mockEvent = createMockEvent({
      status: 'CLOSED',
      orders: [],
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(screen.getByText(/No orders were placed for this event/i)).toBeInTheDocument();
  });
});

describe('EventDetailsModal - Dialog Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onClose when X button is clicked', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent();
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    const xButton = screen.getByRole('button', { name: /close dialog/i });
    await user.click(xButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when footer Close button is clicked', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent();
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /^close$/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking backdrop', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent();
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    // Find the backdrop (it's the div with bg-black/50 class)
    const backdrop = document.querySelector('.bg-black\\/50') as HTMLElement;
    expect(backdrop).toBeInTheDocument();

    await user.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call useEscapeKey hook with onClose callback', async () => {
    const { useEscapeKey } = await import('@/hooks/useAccessibility');
    const mockEvent = createMockEvent();
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(useEscapeKey).toHaveBeenCalledWith(mockOnClose);
  });

  it('should call useFocusTrap hook', async () => {
    const { useFocusTrap } = await import('@/hooks/useAccessibility');
    const mockEvent = createMockEvent();
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    expect(useFocusTrap).toHaveBeenCalledWith(true);
  });
});

describe('EventDetailsModal - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have proper heading hierarchy', () => {
    const mockEvent = createMockEvent({
      title: 'Team Lunch Event',
      participants: [createMockEventParticipant()],
    });
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    // h2 for modal title
    const modalTitle = screen.getByRole('heading', { level: 2, name: /Team Lunch Event/i });
    expect(modalTitle).toBeInTheDocument();
    expect(modalTitle).toHaveAttribute('id', 'event-modal-title');

    // h3 for sections
    expect(screen.getByRole('heading', { level: 3, name: /Event Details/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Order Summary/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Participants/i })).toBeInTheDocument();
  });

  it('should have aria-hidden on backdrop', () => {
    const mockEvent = createMockEvent();
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    const backdrop = document.querySelector('.bg-black\\/50') as HTMLElement;
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
  });

  it('should have aria-label on close button', () => {
    const mockEvent = createMockEvent();
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    const xButton = screen.getByRole('button', { name: /close dialog/i });
    expect(xButton).toHaveAttribute('aria-label', 'Close dialog');
  });

  it('should have aria-hidden on decorative icons', () => {
    const mockEvent = createMockEvent();
    const mockOnClose = vi.fn();

    render(<EventDetailsModal event={mockEvent} onClose={mockOnClose} />);

    // X icon in close button should have aria-hidden
    const xButton = screen.getByRole('button', { name: /close dialog/i });
    const xIcon = xButton.querySelector('svg');
    expect(xIcon).toHaveAttribute('aria-hidden', 'true');
  });
});
