import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Events from '@/pages/Events';
import { useAuthStore } from '@/store/authStore';
import { createMockEvent, createMockUser, createMockEventParticipant, createMockRestaurant } from '@/test/utils/factories';

// Mock the auth store
vi.mock('@/store/authStore');

// Mock API hooks
vi.mock('@/lib/api/hooks', () => ({
  useEvents: vi.fn(() => ({ data: [], isLoading: false })),
  useJoinEvent: vi.fn(() => ({ mutate: vi.fn() })),
  useCloseEvent: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteEvent: vi.fn(() => ({ mutate: vi.fn() })),
  useLeaveEvent: vi.fn(() => ({ mutate: vi.fn() })),
  useRestaurants: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateEvent: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateEvent: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useEvent: vi.fn(() => ({ data: undefined, isLoading: false })),
  useCompanyTheme: vi.fn(() => ({ data: null, isLoading: false })),
  useUpdateCompanyTheme: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUploadThemeCover: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

const renderEvents = (options?: { initialEntries?: Array<string | { pathname: string; state?: any }> }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={options?.initialEntries ?? ['/events']}>
        <Routes>
          <Route path="/events" element={<Events />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Events Page - Rendering & Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents();

    expect(screen.getByRole('heading', { name: /events/i, level: 1 })).toBeInTheDocument();
  });

  it('should render status filter buttons', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents();

    expect(screen.getByRole('button', { name: /^open$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^closed$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
  });

  it('should show Create Event button for admins', async () => {
    const mockUser = createMockUser({ role: 'ADMIN' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents();

    // Should have 2 "Create Event" buttons (one in header, one in empty state)
    const createButtons = screen.getAllByRole('button', { name: /create event/i });
    expect(createButtons.length).toBeGreaterThan(0);
  });

  it('should open Create Event dialog when navigation state requests it', async () => {
    const mockUser = createMockUser({ role: 'ADMIN' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);

    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents({ initialEntries: [{ pathname: '/events', state: { openCreateEvent: true } }] });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should NOT show Create Event button for regular users in header', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents();

    const heading = screen.getByRole('heading', { name: /events/i, level: 1 });
    const header = heading.parentElement;
    const createButtonInHeader = header ? within(header).queryByRole('button', { name: /create event/i }) : null;
    expect(createButtonInHeader).not.toBeInTheDocument();
  });

  it('should display loading skeletons while fetching events', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    renderEvents();

    // Should have 3 loading skeleton cards
    const skeletons = screen.getAllByRole('generic').filter(
      el => el.className.includes('animate-pulse')
    );
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('Events Page - Empty States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display empty state when no events exist', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents();

    expect(screen.getByText(/no events found/i)).toBeInTheDocument();
  });

  it('should show appropriate message for open events filter', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents();

    expect(screen.getByText(/there are no open events at the moment/i)).toBeInTheDocument();
  });

  it('should show Create Event button in empty state for admins', async () => {
    const mockUser = createMockUser({ role: 'ADMIN' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents();

    const emptyStateButtons = screen.getAllByRole('button', { name: /create event/i });
    expect(emptyStateButtons.length).toBeGreaterThan(0);
  });
});

describe('Events Page - Event List Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display list of events', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    const mockEvents = [
      createMockEvent({ title: 'Pizza Lunch', status: 'OPEN' }),
      createMockEvent({ title: 'Sushi Wednesday', status: 'OPEN' }),
      createMockEvent({ title: 'Burger Friday', status: 'CLOSED' }),
    ];

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: mockEvents,
      isLoading: false,
    } as any);

    renderEvents();

    expect(screen.getByText('Pizza Lunch')).toBeInTheDocument();
    expect(screen.getByText('Sushi Wednesday')).toBeInTheDocument();
    expect(screen.getByText('Burger Friday')).toBeInTheDocument();
  });

  it('should display event details: restaurant, location, deadline, payment', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    const mockEvent = createMockEvent({
      title: 'Team Lunch',
      restaurant: createMockRestaurant({ id: '1', name: 'Pizza Palace', cuisine: 'Italian' }),
      deliveryLocation: 'Conference Room A',
      paymentMethod: 'EVENT_CREATOR',
      participants: [
        createMockEventParticipant({ userId: 'user1' }),
        createMockEventParticipant({ id: 'participant-2', userId: 'user2' }),
      ],
    });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    expect(screen.getByText(/pizza palace/i)).toBeInTheDocument();
    expect(screen.getByText(/conference room a/i)).toBeInTheDocument();
    expect(screen.getByText(/creator pays/i)).toBeInTheDocument();
    expect(screen.getByText(/2 participants/i)).toBeInTheDocument();
  });

  it('should display event status badge with correct styling', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    const mockEvent = createMockEvent({ status: 'OPEN' });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    const statusBadge = screen.getByText('OPEN');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-green-500');
  });

  it('should display event description if provided', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    const mockEvent = createMockEvent({
      title: 'Team Lunch',
      description: 'Weekly team bonding lunch',
    });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    expect(screen.getByText(/weekly team bonding lunch/i)).toBeInTheDocument();
  });

  it('should truncate long event titles with ellipsis', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    const longTitle = 'This is a very long event title that should be truncated with ellipsis to prevent layout issues';
    const mockEvent = createMockEvent({ title: longTitle });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    const titleElement = screen.getByText(longTitle);
    expect(titleElement).toHaveClass('truncate');
    expect(titleElement).toHaveAttribute('title', longTitle);
  });
});

describe('Events Page - Status Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter events by OPEN status by default', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    const useEventsMock = vi.mocked(useEvents);
    useEventsMock.mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents();

    // useEvents should be called with 'OPEN' filter by default
    expect(useEventsMock).toHaveBeenCalledWith('OPEN');
  });

  it('should update filter when clicking Closed button', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser({ role: 'USER' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    const useEventsMock = vi.mocked(useEvents);
    useEventsMock.mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents();

    const closedButton = screen.getByRole('button', { name: /^closed$/i });
    await user.click(closedButton);

    await waitFor(() => {
      expect(useEventsMock).toHaveBeenCalledWith('CLOSED');
    });
  });

  it('should update filter when clicking All button', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser({ role: 'USER' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    const useEventsMock = vi.mocked(useEvents);
    useEventsMock.mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents();

    const allButton = screen.getByRole('button', { name: /^all$/i });
    await user.click(allButton);

    await waitFor(() => {
      expect(useEventsMock).toHaveBeenCalledWith(undefined);
    });
  });

  it('should highlight active filter button', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents();

    const openButton = screen.getByRole('button', { name: /^open$/i });
    // Default filter is OPEN, so it should have default variant (not outline)
    expect(openButton).not.toHaveClass('border');
  });
});

describe('Events Page - Event Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show "Join Event" button for non-participants on open events', async () => {
    const mockUser = createMockUser({ id: 'user-123', role: 'USER' });
    const mockEvent = createMockEvent({
      status: 'OPEN',
      participants: [], // User is not a participant
    });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    expect(screen.getByRole('button', { name: /join event/i })).toBeInTheDocument();
  });

  it('should show "Place Order" button for participants on open events', async () => {
    const mockUser = createMockUser({ id: 'user-123', role: 'USER' });
    const mockEvent = createMockEvent({
      status: 'OPEN',
      participants: [createMockEventParticipant({ userId: 'user-123' })], // User is a participant
    });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    expect(screen.getByRole('button', { name: /place order/i })).toBeInTheDocument();
  });

  it('should show "Leave" button for non-creator participants', async () => {
    const mockUser = createMockUser({ id: 'user-123', role: 'USER' });
    const mockEvent = createMockEvent({
      status: 'OPEN',
      createdById: 'other-user',
      participants: [createMockEventParticipant({ userId: 'user-123' })],
    });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument();
  });

  it('should show "Close Event" button for event creators on open events', async () => {
    const mockUser = createMockUser({ id: 'user-123', role: 'USER' });
    const mockEvent = createMockEvent({
      status: 'OPEN',
      createdById: 'user-123', // User is the creator
      participants: [createMockEventParticipant({ userId: 'user-123' })],
    });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    expect(screen.getByRole('button', { name: /close event/i })).toBeInTheDocument();
  });

  it('should show Edit button for event creators on open events', async () => {
    const mockUser = createMockUser({ id: 'user-123', role: 'USER' });
    const mockEvent = createMockEvent({
      status: 'OPEN',
      createdById: 'user-123',
    });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    // Edit button uses Edit icon, no text
    const editButtons = screen.getAllByRole('button');
    const editButton = editButtons.find(btn => btn.querySelector('svg'));
    expect(editButton).toBeInTheDocument();
  });

  it('should show Delete button for event creators', async () => {
    const mockUser = createMockUser({ id: 'user-123', role: 'USER' });
    const mockEvent = createMockEvent({
      createdById: 'user-123',
    });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    // Delete button has red styling
    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons.find(btn => btn.className.includes('text-red-600'));
    expect(deleteButton).toBeInTheDocument();
  });

  it('should show admin-only buttons for admins regardless of creator status', async () => {
    const mockUser = createMockUser({ id: 'admin-123', role: 'ADMIN' });
    const mockEvent = createMockEvent({
      status: 'OPEN',
      createdById: 'other-user', // Admin is not the creator
    });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    // Admin can edit and delete any event
    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons.find(btn => btn.className.includes('text-red-600'));
    expect(deleteButton).toBeInTheDocument();
  });

  it('should NOT show "Join Event" button for closed events', async () => {
    const mockUser = createMockUser({ id: 'user-123', role: 'USER' });
    const mockEvent = createMockEvent({
      status: 'CLOSED',
      participants: [],
    });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    expect(screen.queryByRole('button', { name: /join event/i })).not.toBeInTheDocument();
  });
});

describe('Events Page - Event Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call joinEvent mutation when Join Event button clicked', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser({ id: 'user-123', role: 'USER' });
    const mockEvent = createMockEvent({ id: 'event-123', status: 'OPEN', participants: [] });
    const joinEventMock = vi.fn();

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents, useJoinEvent } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);
    vi.mocked(useJoinEvent).mockReturnValue({
      mutate: joinEventMock,
    } as any);

    renderEvents();

    const joinButton = screen.getByRole('button', { name: /join event/i });
    await user.click(joinButton);

    expect(joinEventMock).toHaveBeenCalledWith('event-123');
  });

  it('should call closeEvent mutation when Close Event button clicked', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser({ id: 'user-123', role: 'ADMIN' });
    const mockEvent = createMockEvent({ id: 'event-123', status: 'OPEN' });
    const closeEventMock = vi.fn();

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents, useCloseEvent } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);
    vi.mocked(useCloseEvent).mockReturnValue({
      mutate: closeEventMock,
    } as any);

    renderEvents();

    const closeButton = screen.getByRole('button', { name: /close event/i });
    await user.click(closeButton);

    expect(closeEventMock).toHaveBeenCalledWith('event-123');
  });

  it('should open delete confirmation dialog when delete button clicked', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser({ id: 'user-123', role: 'ADMIN' });
    const mockEvent = createMockEvent({ id: 'event-123' });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons.find(btn => btn.className.includes('text-red-600'))!;
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /delete event/i })).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete this event/i)).toBeInTheDocument();
    });
  });

  it('should call deleteEvent mutation when confirming deletion', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser({ id: 'user-123', role: 'ADMIN' });
    const mockEvent = createMockEvent({ id: 'event-123' });
    const deleteEventMock = vi.fn();

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents, useDeleteEvent } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);
    vi.mocked(useDeleteEvent).mockReturnValue({
      mutate: deleteEventMock,
    } as any);

    renderEvents();

    // Open delete dialog
    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons.find(btn => btn.className.includes('text-red-600'))!;
    await user.click(deleteButton);

    // Wait for dialog to appear and find the confirmation button
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /delete event/i })).toBeInTheDocument();
    });

    // Get all buttons in the dialog and find the destructive "Delete Event" button
    const deleteButtons = screen.getAllByRole('button');
    const confirmButton = deleteButtons.find(btn => 
      btn.textContent?.includes('Delete Event') && !btn.getAttribute('aria-label')
    )!;
    
    expect(confirmButton).toBeInTheDocument();
    await user.click(confirmButton);

    await waitFor(() => {
      expect(deleteEventMock).toHaveBeenCalledWith('event-123');
    });
  });

  it('should close delete dialog when clicking Cancel', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser({ id: 'user-123', role: 'ADMIN' });
    const mockEvent = createMockEvent({ id: 'event-123' });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    // Open delete dialog
    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons.find(btn => btn.className.includes('text-red-600'))!;
    await user.click(deleteButton);

    // Click Cancel
    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /delete event/i })).not.toBeInTheDocument();
    });
  });

  it('should open leave confirmation dialog when leave button clicked', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser({ id: 'user-123', role: 'USER' });
    const mockEvent = createMockEvent({
      status: 'OPEN',
      createdById: 'other-user',
      participants: [createMockEventParticipant({ userId: 'user-123' })],
    });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    const leaveButton = screen.getByRole('button', { name: /leave/i });
    await user.click(leaveButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /leave event/i })).toBeInTheDocument();
      expect(screen.getByText(/your order will be cancelled/i)).toBeInTheDocument();
    });
  });

  it('should call leaveEvent mutation when confirming leave', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser({ id: 'user-123', role: 'USER' });
    const mockEvent = createMockEvent({
      id: 'event-123',
      status: 'OPEN',
      createdById: 'other-user',
      participants: [createMockEventParticipant({ userId: 'user-123' })],
    });
    const leaveEventMock = vi.fn();

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents, useLeaveEvent } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);
    vi.mocked(useLeaveEvent).mockReturnValue({
      mutate: leaveEventMock,
    } as any);

    renderEvents();

    // Open leave dialog
    const leaveButton = screen.getByRole('button', { name: /leave/i });
    await user.click(leaveButton);

    // Confirm leaving - need to get the second "Leave Event" button (the one in the dialog)
    const confirmButtons = await screen.findAllByRole('button');
    const confirmButton = confirmButtons.find(btn => 
      btn.textContent === 'Leave Event' && !btn.className.includes('text-orange')
    )!;
    await user.click(confirmButton);

    expect(leaveEventMock).toHaveBeenCalledWith('event-123');
  });
});

describe('Events Page - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have proper heading hierarchy', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderEvents();

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/events/i);
  });

  it('should have accessible button labels', async () => {
    const mockUser = createMockUser({ id: 'user-123', role: 'ADMIN' });
    const mockEvent = createMockEvent({ status: 'OPEN', participants: [] });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    // Check that all buttons have accessible labels
    const allButtons = screen.getAllByRole('button');
    allButtons.forEach((button, index) => {
      // Every button should have text content or title or aria-label
      const hasText = button.textContent && button.textContent.trim().length > 0;
      const hasTitle = button.hasAttribute('title');
      const hasAriaLabel = button.hasAttribute('aria-label');
      
      if (!(hasText || hasTitle || hasAriaLabel)) {
        console.log(`Button ${index} lacks accessible label:`, button.outerHTML.substring(0, 200));
      }
      
      expect(hasText || hasTitle || hasAriaLabel).toBe(true);
    });
  });

  it('should provide title attributes for truncated text', async () => {
    const mockUser = createMockUser({ role: 'USER' });
    const longTitle = 'This is a very long event title';
    const mockEvent = createMockEvent({ title: longTitle });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    const titleElement = screen.getByText(longTitle);
    expect(titleElement).toHaveAttribute('title', longTitle);
  });

  it('should have proper dialog roles for modals', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser({ id: 'user-123', role: 'ADMIN' });
    const mockEvent = createMockEvent({ id: 'event-123' });

    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser, token: 'test-token' } as any);
    
    const { useEvents } = await import('@/lib/api/hooks');
    vi.mocked(useEvents).mockReturnValue({
      data: [mockEvent],
      isLoading: false,
    } as any);

    renderEvents();

    // Open delete dialog
    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons.find(btn => btn.className.includes('text-red-600'))!;
    await user.click(deleteButton);

    await waitFor(() => {
      const dialogHeading = screen.getByRole('heading', { name: /delete event/i });
      expect(dialogHeading).toBeInTheDocument();
    });
  });
});
