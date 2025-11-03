import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditEventDialog } from '@/components/events/EditEventDialog';
import { createMockEvent, createMockRestaurant } from '@/test/utils/factories';

// Mock API hooks
vi.mock('@/lib/api/hooks', () => ({
  useUpdateEvent: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRestaurants: vi.fn(() => ({ data: [], isLoading: false })),
}));

const renderEditEventDialog = (event = createMockEvent()) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EditEventDialog event={event} />
    </QueryClientProvider>
  );
};

describe('EditEventDialog - Rendering & Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trigger button when dialog is closed', () => {
    renderEditEventDialog();

    const editButton = screen.getByRole('button', { name: /edit event/i });
    expect(editButton).toBeInTheDocument();
    expect(editButton).toHaveAttribute('aria-label', 'Edit event');
  });

  it('should open dialog when trigger button is clicked', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    const triggerButton = screen.getByRole('button', { name: /edit event/i });
    await user.click(triggerButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /edit event/i })).toBeInTheDocument();
  });

  it('should render all form fields when dialog is open', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));

    expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/restaurant/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delivery location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/order deadline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
  });

  it('should render update and cancel buttons', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /update event/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should render close button in dialog header', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const closeButtons = screen.getAllByRole('button');
    // Close button is the X button without text
    const closeButton = closeButtons.find(btn => 
      btn.querySelector('svg') && !btn.textContent?.trim()
    );
    expect(closeButton).toBeInTheDocument();
  });
});

describe('EditEventDialog - Form Pre-population', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pre-populate form fields with event data', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent({
      title: 'Team Pizza Lunch',
      description: 'Monthly team gathering',
      deliveryLocation: 'Conference Room A',
      orderDeadline: '2025-10-20T14:30:00.000Z',
    });

    renderEditEventDialog(mockEvent);
    await user.click(screen.getByRole('button', { name: /edit event/i }));

    expect(screen.getByLabelText(/event title/i)).toHaveValue('Team Pizza Lunch');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Monthly team gathering');
    expect(screen.getByLabelText(/delivery location/i)).toHaveValue('Conference Room A');
    
    // Order deadline should be formatted as datetime-local (date-fns format preserves local time)
    const deadlineInput = screen.getByLabelText(/order deadline/i) as HTMLInputElement;
    // Just verify it's a valid datetime-local format (YYYY-MM-DDTHH:MM)
    expect(deadlineInput.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('should pre-select restaurant from event data', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent({
      restaurantId: 'restaurant-1',
    });

    const mockRestaurants = [
      createMockRestaurant({ id: 'restaurant-1', name: 'Pizza Palace' }),
    ];

    const { useRestaurants } = await import('@/lib/api/hooks');
    vi.mocked(useRestaurants).mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
    } as any);

    renderEditEventDialog(mockEvent);
    await user.click(screen.getByRole('button', { name: /edit event/i }));

    // Check hidden select value
    const hiddenSelect = document.querySelector(`#restaurant-native`) as HTMLSelectElement;
    expect(hiddenSelect.value).toBe('restaurant-1');
  });

  it('should pre-select payment method from event data', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent({
      paymentMethod: 'INDIVIDUAL',
    });

    renderEditEventDialog(mockEvent);
    await user.click(screen.getByRole('button', { name: /edit event/i }));

    // Check hidden select value
    const hiddenSelect = document.querySelector(`#paymentMethod-native`) as HTMLSelectElement;
    expect(hiddenSelect.value).toBe('INDIVIDUAL');
    
    // Verify combobox button shows correct text
    const paymentButton = screen.getByRole('combobox', { name: /payment method/i });
    expect(paymentButton).toHaveTextContent(/individual pays/i);
  });

  it('should handle empty description gracefully', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent({
      description: undefined,
    });

    renderEditEventDialog(mockEvent);
    await user.click(screen.getByRole('button', { name: /edit event/i }));

    expect(screen.getByLabelText(/description/i)).toHaveValue('');
  });
});

describe('EditEventDialog - Form Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update title field when user types', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const titleInput = screen.getByLabelText(/event title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Team Lunch');

    expect(titleInput).toHaveValue('Updated Team Lunch');
  });

  it('should update description field when user types', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const descriptionInput = screen.getByLabelText(/description/i);
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated description');

    expect(descriptionInput).toHaveValue('Updated description');
  });

  it('should update delivery location when user types', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const locationInput = screen.getByLabelText(/delivery location/i);
    await user.clear(locationInput);
    await user.type(locationInput, 'New Conference Room');

    expect(locationInput).toHaveValue('New Conference Room');
  });

  it('should update restaurant selection when user changes it', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent({ restaurantId: 'restaurant-1' });
    const mockRestaurants = [
      createMockRestaurant({ id: 'restaurant-1', name: 'Pizza Palace' }),
      createMockRestaurant({ id: 'restaurant-2', name: 'Sushi Bar' }),
    ];

    const { useRestaurants } = await import('@/lib/api/hooks');
    vi.mocked(useRestaurants).mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
    } as any);

    renderEditEventDialog(mockEvent);
    await user.click(screen.getByRole('button', { name: /edit event/i }));

    // Open restaurant select and choose different option
    const restaurantButton = screen.getByRole('combobox', { name: /restaurant/i });
    await user.click(restaurantButton);
    
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    const options = screen.getAllByRole('option');
    await user.click(options[2]); // Sushi Bar (index 0 is "Select...", 1 is Pizza Palace, 2 is Sushi Bar)

    // Verify selection
    const hiddenSelect = document.querySelector(`#restaurant-native`) as HTMLSelectElement;
    expect(hiddenSelect.value).toBe('restaurant-2');
  });

  it('should update payment method when user changes it', async () => {
    const user = userEvent.setup();
    const mockEvent = createMockEvent({ paymentMethod: 'EVENT_CREATOR' });

    renderEditEventDialog(mockEvent);
    await user.click(screen.getByRole('button', { name: /edit event/i }));

    // Open payment method select and choose different option
    const paymentButton = screen.getByRole('combobox', { name: /payment method/i });
    await user.click(paymentButton);
    
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    const options = screen.getAllByRole('option');
    await user.click(options[2]); // Company Expense (index 0 is Event Creator, 1 is Individual, 2 is Company)

    // Verify selection
    const hiddenSelect = document.querySelector(`#paymentMethod-native`) as HTMLSelectElement;
    expect(hiddenSelect.value).toBe('COMPANY_EXPENSE');
  });

  it('should update order deadline when user changes date/time', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const deadlineInput = screen.getByLabelText(/order deadline/i);
    await user.clear(deadlineInput);
    await user.type(deadlineInput, '2025-11-15T16:00');

    expect(deadlineInput).toHaveValue('2025-11-15T16:00');
  });
});

describe('EditEventDialog - Form Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call updateEvent mutation with correct data on submit', async () => {
    const user = userEvent.setup();
    const updateEventMock = vi.fn().mockResolvedValue({});
    const mockEvent = createMockEvent({
      id: 'event-123',
      title: 'Original Title',
    });

    const mockRestaurants = [
      createMockRestaurant({ id: 'restaurant-1', name: 'Pizza Palace' }),
    ];

    const { useUpdateEvent, useRestaurants } = await import('@/lib/api/hooks');
    vi.mocked(useUpdateEvent).mockReturnValue({
      mutateAsync: updateEventMock,
    } as any);
    vi.mocked(useRestaurants).mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
    } as any);

    renderEditEventDialog(mockEvent);
    await user.click(screen.getByRole('button', { name: /edit event/i }));

    // Update title
    const titleInput = screen.getByLabelText(/event title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    // Submit form
    const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /update event/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(updateEventMock).toHaveBeenCalledWith({
        eventId: 'event-123',
        data: expect.objectContaining({
          title: 'Updated Title',
        }),
      });
    });
  });

  it('should include updated description in submission', async () => {
    const user = userEvent.setup();
    const updateEventMock = vi.fn().mockResolvedValue({});
    const mockEvent = createMockEvent({ id: 'event-123' });

    const { useUpdateEvent } = await import('@/lib/api/hooks');
    vi.mocked(useUpdateEvent).mockReturnValue({
      mutateAsync: updateEventMock,
    } as any);

    renderEditEventDialog(mockEvent);
    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const descriptionInput = screen.getByLabelText(/description/i);
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'New description');

    const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /update event/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(updateEventMock).toHaveBeenCalledWith({
        eventId: 'event-123',
        data: expect.objectContaining({
          description: 'New description',
        }),
      });
    });
  });

  it('should convert datetime-local to ISO string in submission', async () => {
    const user = userEvent.setup();
    const updateEventMock = vi.fn().mockResolvedValue({});
    const mockEvent = createMockEvent({ id: 'event-123' });

    const { useUpdateEvent } = await import('@/lib/api/hooks');
    vi.mocked(useUpdateEvent).mockReturnValue({
      mutateAsync: updateEventMock,
    } as any);

    renderEditEventDialog(mockEvent);
    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /update event/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(updateEventMock).toHaveBeenCalledWith({
        eventId: 'event-123',
        data: expect.objectContaining({
          orderDeadline: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
        }),
      });
    });
  });

  it('should close dialog after successful submission', async () => {
    const user = userEvent.setup();
    const updateEventMock = vi.fn().mockResolvedValue({});
    const mockEvent = createMockEvent({ id: 'event-123' });

    const { useUpdateEvent } = await import('@/lib/api/hooks');
    vi.mocked(useUpdateEvent).mockReturnValue({
      mutateAsync: updateEventMock,
    } as any);

    renderEditEventDialog(mockEvent);
    await user.click(screen.getByRole('button', { name: /edit event/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /update event/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should call onClose callback if provided after successful submission', async () => {
    const user = userEvent.setup();
    const updateEventMock = vi.fn().mockResolvedValue({});
    const onCloseMock = vi.fn();
    const mockEvent = createMockEvent({ id: 'event-123' });

    const { useUpdateEvent } = await import('@/lib/api/hooks');
    vi.mocked(useUpdateEvent).mockReturnValue({
      mutateAsync: updateEventMock,
    } as any);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <EditEventDialog event={mockEvent} onClose={onCloseMock} />
      </QueryClientProvider>
    );

    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /update event/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});

describe('EditEventDialog - Dialog Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should close dialog when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should close dialog when X button is clicked', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Find X button - it's inside the dialog and has X icon but no text content
    const dialog = screen.getByRole('dialog');
    const buttons = within(dialog).getAllByRole('button');
    const xButton = buttons.find(btn => {
      const svg = btn.querySelector('svg.lucide-x');
      return svg && !btn.textContent?.trim();
    })!;
    
    await user.click(xButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should call onClose callback when dialog is closed via Cancel', async () => {
    const user = userEvent.setup();
    const onCloseMock = vi.fn();

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <EditEventDialog event={createMockEvent()} onClose={onCloseMock} />
      </QueryClientProvider>
    );

    await user.click(screen.getByRole('button', { name: /edit event/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});

describe('EditEventDialog - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have proper dialog role and aria attributes', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('should have all form labels associated with inputs', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));

    // All these should work because labels are properly associated
    expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/restaurant/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delivery location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/order deadline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
  });

  it('should have proper heading hierarchy', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const heading = screen.getByRole('heading', { name: /edit event/i });
    expect(heading).toHaveAttribute('id');
  });

  it('should have descriptive button labels', async () => {
    const user = userEvent.setup();
    renderEditEventDialog();

    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /update event/i })).toBeInTheDocument();
  });
});

describe('EditEventDialog - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle submission error gracefully', async () => {
    const user = userEvent.setup();
    const updateEventMock = vi.fn().mockRejectedValue(new Error('Network error'));
    const mockEvent = createMockEvent({ id: 'event-123' });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { useUpdateEvent } = await import('@/lib/api/hooks');
    vi.mocked(useUpdateEvent).mockReturnValue({
      mutateAsync: updateEventMock,
    } as any);

    renderEditEventDialog(mockEvent);
    await user.click(screen.getByRole('button', { name: /edit event/i }));

    const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /update event/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    // Dialog should remain open on error
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
