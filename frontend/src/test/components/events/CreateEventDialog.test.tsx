import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateEventDialog } from '@/components/features/CreateEventDialog';
import { createMockRestaurant } from '@/test/utils/factories';

// Mock API hooks
vi.mock('@/lib/api/hooks', () => ({
  useCreateEvent: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useRestaurants: vi.fn(() => ({ data: [], isLoading: false })),
  useCompanyTheme: vi.fn(() => ({ data: null, isLoading: false })),
  useUpdateCompanyTheme: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUploadThemeCover: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

type DialogProps = Parameters<typeof CreateEventDialog>[0];

const renderCreateEventDialog = (props?: DialogProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CreateEventDialog {...props} />
    </QueryClientProvider>
  );
};

describe('CreateEventDialog - Rendering & Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trigger button when dialog is closed', () => {
    renderCreateEventDialog();

    expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
  });

  it('should open dialog when trigger button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    const triggerButton = screen.getByRole('button', { name: /create event/i });
    await user.click(triggerButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /create new event/i })).toBeInTheDocument();
  });

  it('should render all form fields when dialog is open', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/restaurant/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delivery location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/order deadline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
  });

  it('should render submit and cancel buttons', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /^create event$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should render close button in dialog header', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    const closeButtons = screen.getAllByRole('button');
    // Close button is the X button without text
    const closeButton = closeButtons.find(btn => 
      btn.querySelector('svg') && !btn.textContent?.trim()
    );
    expect(closeButton).toBeInTheDocument();
  });
});

describe('CreateEventDialog - Auto Open Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens automatically when autoOpen prop is true', async () => {
    const onAutoOpenHandled = vi.fn();
    renderCreateEventDialog({ autoOpen: true, onAutoOpenHandled });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await waitFor(() => {
      expect(onAutoOpenHandled).toHaveBeenCalled();
    });
  });
});

describe('CreateEventDialog - Form Field Types & Attributes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct input types for all fields', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    const titleInput = screen.getByLabelText(/event title/i);
    const deliveryInput = screen.getByLabelText(/delivery location/i);
    const deadlineInput = screen.getByLabelText(/order deadline/i);

    // Check input field types - text inputs may not have explicit type="text" (it's the default)
    expect(titleInput.tagName).toBe('INPUT');
    expect(deliveryInput.tagName).toBe('INPUT');
    expect(deadlineInput).toHaveAttribute('type', 'datetime-local');
    
    // Custom Select components use combobox pattern, not native input
    expect(screen.getByRole('combobox', { name: /restaurant/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /payment method/i })).toBeInTheDocument();
  });

  it('should mark required fields with required attribute', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    // Regular input fields
    expect(screen.getByLabelText(/event title/i)).toBeRequired();
    expect(screen.getByLabelText(/delivery location/i)).toBeRequired();
    expect(screen.getByLabelText(/order deadline/i)).toBeRequired();
    
    // Custom Select: hidden native select has required attribute (but it's hidden and has different ID)
    const hiddenRestaurantSelect = document.querySelector('#restaurant-native') as HTMLSelectElement;
    expect(hiddenRestaurantSelect).toBeRequired();
  });

  it('should have description as optional field', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    expect(screen.getByLabelText(/description/i)).not.toBeRequired();
  });

  it('should have placeholder text for all input fields', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    expect(screen.getByPlaceholderText(/team lunch.*pizza day/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/weekly team lunch/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/office conference room/i)).toBeInTheDocument();
  });
});

describe('CreateEventDialog - Restaurant Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display list of restaurants in select dropdown', async () => {
    const user = userEvent.setup();
    const mockRestaurants = [
      createMockRestaurant({ id: '1', name: 'Pizza Palace', cuisine: 'Italian' }),
      createMockRestaurant({ id: '2', name: 'Sushi Bar', cuisine: 'Japanese' }),
      createMockRestaurant({ id: '3', name: 'Burger Joint', cuisine: 'American' }),
    ];

    const { useRestaurants } = await import('@/lib/api/hooks');
    vi.mocked(useRestaurants).mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
    } as any);

    renderCreateEventDialog();
    await user.click(screen.getByRole('button', { name: /create event/i }));

    // Open the restaurant select dropdown
    const restaurantButton = screen.getByRole('combobox', { name: /restaurant/i });
    expect(restaurantButton).toBeInTheDocument();
    
    await user.click(restaurantButton);
    
    // Wait for listbox to appear
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    // Check that all restaurants are in the listbox (options are visible)
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4); // "Select a restaurant" + 3 restaurants
    
    // Verify specific restaurant options are present (check text content since aria-hidden affects name matching)
    expect(options[1].textContent).toContain('Pizza Palace');
    expect(options[2].textContent).toContain('Sushi Bar');
    expect(options[3].textContent).toContain('Burger Joint');
  });

  it('should have default "Select a restaurant" option', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    // Open the restaurant select dropdown
    const restaurantButton = screen.getByRole('combobox', { name: /restaurant/i });
    await user.click(restaurantButton);
    
    // Wait for listbox to appear
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    // Check for default option
    expect(screen.getByRole('option', { name: /select a restaurant/i })).toBeInTheDocument();
  });

  it('should display empty select when no restaurants available', async () => {
    const user = userEvent.setup();
    const { useRestaurants } = await import('@/lib/api/hooks');
    vi.mocked(useRestaurants).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderCreateEventDialog();
    await user.click(screen.getByRole('button', { name: /create event/i }));

    // Open the restaurant select dropdown
    const restaurantButton = screen.getByRole('combobox', { name: /restaurant/i });
    await user.click(restaurantButton);
    
    // Wait for listbox to appear
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1); // Only "Select a restaurant"
    expect(options[0]).toHaveTextContent(/select a restaurant/i);
  });
});

describe('CreateEventDialog - Payment Method Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display all payment method options', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    // Open the payment method select dropdown
    const paymentButton = screen.getByRole('combobox', { name: /payment method/i });
    await user.click(paymentButton);
    
    // Wait for listbox to appear
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    expect(screen.getByRole('option', { name: /event creator pays/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /individual pays/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /company expense/i })).toBeInTheDocument();
  });

  it('should have "Event Creator Pays" as default payment method', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    // Check the hidden select element for default value
    const paymentSelect = document.querySelector('#paymentMethod-native') as HTMLSelectElement;
    expect(paymentSelect.value).toBe('EVENT_CREATOR');
    
    // Also verify the combobox button shows the default text
    const paymentButton = screen.getByRole('combobox', { name: /payment method/i });
    expect(paymentButton).toHaveTextContent(/event creator pays/i);
  });
});

describe('CreateEventDialog - Form Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update title field when user types', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    const titleInput = screen.getByLabelText(/event title/i);
    await user.type(titleInput, 'Team Pizza Lunch');

    expect(titleInput).toHaveValue('Team Pizza Lunch');
  });

  it('should update description field when user types', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    const descriptionInput = screen.getByLabelText(/description/i);
    await user.type(descriptionInput, 'Weekly team bonding');

    expect(descriptionInput).toHaveValue('Weekly team bonding');
  });

  it('should update delivery location field when user types', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    const locationInput = screen.getByLabelText(/delivery location/i);
    await user.type(locationInput, 'Main Office Lobby');

    expect(locationInput).toHaveValue('Main Office Lobby');
  });

  it('should update restaurant selection when user selects', async () => {
    const user = userEvent.setup();
    const mockRestaurants = [
      createMockRestaurant({ id: 'rest-1', name: 'Pizza Palace', cuisine: 'Italian' }),
    ];

    const { useRestaurants } = await import('@/lib/api/hooks');
    vi.mocked(useRestaurants).mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
    } as any);

    renderCreateEventDialog();
    await user.click(screen.getByRole('button', { name: /create event/i }));

    // For custom Select component, click the combobox button to open
    const restaurantButton = screen.getByRole('combobox', { name: /restaurant/i });
    await user.click(restaurantButton);

    // Wait for listbox and click option
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    const options = screen.getAllByRole('option');
    await user.click(options[1]); // Pizza Palace (index 0 is "Select a restaurant")

    // Verify selection via the hidden select element
    const hiddenSelect = document.querySelector('#restaurant-native') as HTMLSelectElement;
    expect(hiddenSelect.value).toBe('rest-1');
  });

  it('should update payment method when user selects', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    // For custom Select component, click the combobox button to open
    const paymentButton = screen.getByRole('combobox', { name: /payment method/i });
    await user.click(paymentButton);

    // Wait for listbox and click option
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    const options = screen.getAllByRole('option');
    await user.click(options[1]); // Individual Pays (index 0 is "Event Creator Pays")

    // Verify selection via the hidden select element
    const hiddenSelect = document.querySelector('#paymentMethod-native') as HTMLSelectElement;
    expect(hiddenSelect.value).toBe('INDIVIDUAL');
  });

  it('should update deadline when user selects date/time', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    const deadlineInput = screen.getByLabelText(/order deadline/i);
    await user.type(deadlineInput, '2025-10-15T14:30');

    expect(deadlineInput).toHaveValue('2025-10-15T14:30');
  });
});

describe('CreateEventDialog - Form Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call createEvent mutation with correct data on submit', async () => {
    const user = userEvent.setup();
    const createEventMock = vi.fn().mockResolvedValue({});
    const mockRestaurants = [
      createMockRestaurant({ id: 'rest-1', name: 'Pizza Palace', cuisine: 'Italian' }),
    ];

    const { useCreateEvent, useRestaurants } = await import('@/lib/api/hooks');
    vi.mocked(useCreateEvent).mockReturnValue({
      mutateAsync: createEventMock,
    } as any);
    vi.mocked(useRestaurants).mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
    } as any);

    renderCreateEventDialog();
    
    await user.click(screen.getByRole('button', { name: /create event/i }));

    // Fill in required fields
    await user.type(screen.getByLabelText(/event title/i), 'Team Lunch');
    
    // Select restaurant using custom Select component
    const restaurantButton = screen.getByRole('combobox', { name: /restaurant/i });
    await user.click(restaurantButton);
    
    // Wait for listbox to appear and click the second option (first is "Select a restaurant")
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    const options = screen.getAllByRole('option');
    await user.click(options[1]); // Pizza Palace - Italian
    
    await user.type(screen.getByLabelText(/delivery location/i), 'Office Lobby');
    await user.type(screen.getByLabelText(/order deadline/i), '2025-10-15T14:30');

    // Submit form
    const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /^create event$/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(createEventMock).toHaveBeenCalledWith({
        title: 'Team Lunch',
        description: '',
        restaurantId: 'rest-1',
        deliveryLocation: 'Office Lobby',
        orderDeadline: expect.any(String), // ISO string
        paymentMethod: 'EVENT_CREATOR',
      });
    });
  });

  it('should include description if provided', async () => {
    const user = userEvent.setup();
    const createEventMock = vi.fn().mockResolvedValue({});
    const mockRestaurants = [
      createMockRestaurant({ id: 'rest-1', name: 'Pizza Palace' }),
    ];

    const { useCreateEvent, useRestaurants } = await import('@/lib/api/hooks');
    vi.mocked(useCreateEvent).mockReturnValue({
      mutateAsync: createEventMock,
    } as any);
    vi.mocked(useRestaurants).mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
    } as any);

    renderCreateEventDialog();
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await user.type(screen.getByLabelText(/event title/i), 'Team Lunch');
    await user.type(screen.getByLabelText(/description/i), 'Monthly team lunch');
    
    // Select restaurant
    const restaurantButton = screen.getByRole('combobox', { name: /restaurant/i });
    await user.click(restaurantButton);
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    const restaurantOptions = screen.getAllByRole('option');
    await user.click(restaurantOptions[1]);
    
    await user.type(screen.getByLabelText(/delivery location/i), 'Office');
    await user.type(screen.getByLabelText(/order deadline/i), '2025-10-15T14:30');

    const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /^create event$/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(createEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Monthly team lunch',
        })
      );
    });
  });

  it('should close dialog after successful submission', async () => {
    const user = userEvent.setup();
    const createEventMock = vi.fn().mockResolvedValue({});
    const mockRestaurants = [
      createMockRestaurant({ id: 'rest-1', name: 'Pizza Palace' }),
    ];

    const { useCreateEvent, useRestaurants } = await import('@/lib/api/hooks');
    vi.mocked(useCreateEvent).mockReturnValue({
      mutateAsync: createEventMock,
    } as any);
    vi.mocked(useRestaurants).mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
    } as any);

    renderCreateEventDialog();
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await user.type(screen.getByLabelText(/event title/i), 'Team Lunch');
    
    // Select restaurant
    const restaurantButton = screen.getByRole('combobox', { name: /restaurant/i });
    await user.click(restaurantButton);
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    const restaurantOptions = screen.getAllByRole('option');
    await user.click(restaurantOptions[1]);
    
    await user.type(screen.getByLabelText(/delivery location/i), 'Office');
    await user.type(screen.getByLabelText(/order deadline/i), '2025-10-15T14:30');

    const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /^create event$/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should reset form after successful submission', async () => {
    const user = userEvent.setup();
    const createEventMock = vi.fn().mockResolvedValue({});
    const mockRestaurants = [
      createMockRestaurant({ id: 'rest-1', name: 'Pizza Palace' }),
    ];

    const { useCreateEvent, useRestaurants } = await import('@/lib/api/hooks');
    vi.mocked(useCreateEvent).mockReturnValue({
      mutateAsync: createEventMock,
    } as any);
    vi.mocked(useRestaurants).mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
    } as any);

    renderCreateEventDialog();
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await user.type(screen.getByLabelText(/event title/i), 'Team Lunch');
    
    // Select restaurant
    const restaurantButton = screen.getByRole('combobox', { name: /restaurant/i });
    await user.click(restaurantButton);
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    const restaurantOptions = screen.getAllByRole('option');
    await user.click(restaurantOptions[1]);
    
    await user.type(screen.getByLabelText(/delivery location/i), 'Office');
    await user.type(screen.getByLabelText(/order deadline/i), '2025-10-15T14:30');

    const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /^create event$/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Reopen dialog and check fields are reset
    await user.click(screen.getByRole('button', { name: /create event/i }));

    expect(screen.getByLabelText(/event title/i)).toHaveValue('');
    expect(screen.getByLabelText(/description/i)).toHaveValue('');
    
    // Check hidden select value for restaurant (custom Select component)
    const restaurantSelect = document.querySelector('#restaurant-native') as HTMLSelectElement;
    expect(restaurantSelect.value).toBe('');
    
    expect(screen.getByLabelText(/delivery location/i)).toHaveValue('');
    expect(screen.getByLabelText(/order deadline/i)).toHaveValue('');
  });

  it('should prevent submission when required fields are empty', async () => {
    const user = userEvent.setup();
    const createEventMock = vi.fn();

    const { useCreateEvent } = await import('@/lib/api/hooks');
    vi.mocked(useCreateEvent).mockReturnValue({
      mutateAsync: createEventMock,
    } as any);

    renderCreateEventDialog();
    await user.click(screen.getByRole('button', { name: /create event/i }));

    // Try to submit without filling required fields - scope to dialog
    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getByRole('button', { name: /^create event$/i });
    await user.click(submitButton);

    // Mutation should not be called (HTML5 validation prevents it)
    expect(createEventMock).not.toHaveBeenCalled();
  });
});

describe('CreateEventDialog - Dialog Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should close dialog when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should close dialog when X button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(btn => 
      btn.querySelector('svg') && !btn.textContent?.trim()
    )!;
    await user.click(xButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should close dialog when clicking backdrop', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Get the backdrop element (it's the parent of the dialog with the onMouseDown handler)
    const dialog = screen.getByRole('dialog');
    
    // The backdrop is the dialog itself (it has role="dialog" and is the outer wrapper)
    // We need to simulate a mousedown event on the backdrop area
    // Since the dialog prevents propagation, we need to click outside the inner content div
    const backdrop = dialog;
    
    // Fire mousedown event directly (this is how the real interaction works)
    const mouseDownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    
    Object.defineProperty(mouseDownEvent, 'target', {
      value: backdrop,
      enumerable: true,
    });
    
    Object.defineProperty(mouseDownEvent, 'currentTarget', {
      value: backdrop,
      enumerable: true,
    });
    
    backdrop.dispatchEvent(mouseDownEvent);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should NOT close dialog when clicking inside dialog content', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));
    
    // Verify dialog is open
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click on form content (heading, input, etc.) - not the backdrop
    const heading = screen.getByRole('heading', { name: /create new event/i });
    await user.click(heading);

    // Dialog should still be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('CreateEventDialog - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have proper dialog role and aria attributes', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'create-event-dialog-title');
  });

  it('should have all form labels associated with inputs', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

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
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    const heading = screen.getByRole('heading', { name: /create new event/i });
    expect(heading).toHaveAttribute('id', 'create-event-dialog-title');
  });

  it('should have descriptive button labels', async () => {
    const user = userEvent.setup();
    renderCreateEventDialog();

    await user.click(screen.getByRole('button', { name: /create event/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^create event$/i })).toBeInTheDocument();
  });
});

describe('CreateEventDialog - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle submission error gracefully', async () => {
    const user = userEvent.setup();
    const createEventMock = vi.fn().mockRejectedValue(new Error('Network error'));
    const mockRestaurants = [
      createMockRestaurant({ id: 'rest-1', name: 'Pizza Palace' }),
    ];
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { useCreateEvent, useRestaurants } = await import('@/lib/api/hooks');
    vi.mocked(useCreateEvent).mockReturnValue({
      mutateAsync: createEventMock,
    } as any);
    vi.mocked(useRestaurants).mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
    } as any);

    renderCreateEventDialog();
    await user.click(screen.getByRole('button', { name: /create event/i }));

    await user.type(screen.getByLabelText(/event title/i), 'Team Lunch');
    
    // Select restaurant
    const restaurantButton = screen.getByRole('combobox', { name: /restaurant/i });
    await user.click(restaurantButton);
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    const restaurantOptions = screen.getAllByRole('option');
    await user.click(restaurantOptions[1]);
    
    await user.type(screen.getByLabelText(/delivery location/i), 'Office');
    await user.type(screen.getByLabelText(/order deadline/i), '2025-10-15T14:30');

    const submitButton = within(screen.getByRole('dialog')).getByRole('button', { name: /^create event$/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    // Dialog should remain open on error
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
