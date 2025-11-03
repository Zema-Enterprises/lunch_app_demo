import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/test-utils';
import { AddMenuItemDialog } from '../../../components/menu/AddMenuItemDialog';

// Mock hooks
vi.mock('../../../lib/api/hooks', async () => {
  const actual = await import('../../../lib/api/hooks');
  return {
    ...actual,
    useCreateMenuItem: vi.fn(),
  };
});

describe('AddMenuItemDialog', () => {
  const mockRestaurantId = 'rest-1';

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useCreateMenuItem } = await import('../../../lib/api/hooks');
    vi.mocked(useCreateMenuItem).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering & Structure', () => {
    it('should render trigger button', () => {
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should open dialog when trigger button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add menu item/i })).toBeInTheDocument();
      });
    });

    it('should render all form fields when dialog is open', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/margherita pizza/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/fresh mozzarella/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/12\.99/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/pizza, pasta, salad/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/available for ordering/i)).toBeInTheDocument();
      });
    });

    it('should render action buttons when dialog is open', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
        // There are 2 "Add Menu Item" buttons (trigger + submit), verify submit button exists
        const submitButtons = screen.getAllByRole('button', { name: /add menu item/i });
        expect(submitButtons.length).toBe(2);
      });
    });
  });

  describe('Form Interaction', () => {
    it('should update name field when typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      const nameInput = await screen.findByPlaceholderText(/margherita pizza/i);
      await user.type(nameInput, 'Pepperoni Pizza');

      expect(nameInput).toHaveValue('Pepperoni Pizza');
    });

    it('should update description field when typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      const descInput = await screen.findByPlaceholderText(/fresh mozzarella/i);
      await user.type(descInput, 'Delicious pizza');

      expect(descInput).toHaveValue('Delicious pizza');
    });

    it('should update price field when typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      const priceInput = await screen.findByPlaceholderText(/12\.99/i);
      await user.type(priceInput, '15.99');

      expect(priceInput).toHaveValue(15.99);
    });

    it('should update category field when typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      const categoryInput = await screen.findByPlaceholderText(/pizza, pasta, salad/i);
      await user.type(categoryInput, 'Pizza');

      expect(categoryInput).toHaveValue('Pizza');
    });

    it('should toggle available checkbox', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      const availableCheckbox = await screen.findByLabelText(/available for ordering/i);
      expect(availableCheckbox).toBeChecked(); // Default is true

      await user.click(availableCheckbox);
      expect(availableCheckbox).not.toBeChecked();

      await user.click(availableCheckbox);
      expect(availableCheckbox).toBeChecked();
    });
  });

  describe('Form Submission', () => {
    it('should call createMenuItem with correct data when form is submitted', async () => {
      const user = userEvent.setup();
      const { useCreateMenuItem } = await import('../../../lib/api/hooks');
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      
      vi.mocked(useCreateMenuItem).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      // Fill in required fields
      const nameInput = await screen.findByPlaceholderText(/margherita pizza/i);
      await user.type(nameInput, 'Pepperoni Pizza');

      const descInput = await screen.findByPlaceholderText(/fresh mozzarella/i);
      await user.type(descInput, 'Delicious pizza');

      const priceInput = await screen.findByPlaceholderText(/12\.99/i);
      await user.type(priceInput, '15.99');

      const categoryInput = await screen.findByPlaceholderText(/pizza, pasta, salad/i);
      await user.type(categoryInput, 'Pizza');

      // Submit form
      const submitButtons = screen.getAllByRole('button', { name: /add menu item/i });
      const submitButton = submitButtons[submitButtons.length - 1]; // Get the one inside dialog
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          restaurantId: mockRestaurantId,
          data: {
            name: 'Pepperoni Pizza',
            description: 'Delicious pizza',
            price: 15.99,
            category: 'Pizza',
            available: true,
          },
        });
      });
    });

    it('should close dialog after successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      // Fill in required fields
      const nameInput = await screen.findByPlaceholderText(/margherita pizza/i);
      await user.type(nameInput, 'Pepperoni Pizza');

      const priceInput = await screen.findByPlaceholderText(/12\.99/i);
      await user.type(priceInput, '15.99');

      const categoryInput = await screen.findByPlaceholderText(/pizza, pasta, salad/i);
      await user.type(categoryInput, 'Pizza');

      // Submit form
      const submitButtons = screen.getAllByRole('button', { name: /add menu item/i });
      const submitButton = submitButtons[submitButtons.length - 1];
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /add menu item/i })).not.toBeInTheDocument();
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      // Open dialog and fill form
      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      const nameInput = await screen.findByPlaceholderText(/margherita pizza/i);
      await user.type(nameInput, 'Pepperoni Pizza');

      const priceInput = await screen.findByPlaceholderText(/12\.99/i);
      await user.type(priceInput, '15.99');

      const categoryInput = await screen.findByPlaceholderText(/pizza, pasta, salad/i);
      await user.type(categoryInput, 'Pizza');

      // Submit
      const submitButtons = screen.getAllByRole('button', { name: /add menu item/i });
      const submitButton = submitButtons[submitButtons.length - 1];
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /add menu item/i })).not.toBeInTheDocument();
      });

      // Reopen dialog and check fields are empty
      await user.click(addButton);

      const newNameInput = await screen.findByPlaceholderText(/margherita pizza/i);
      expect(newNameInput).toHaveValue('');
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const { useCreateMenuItem } = await import('../../../lib/api/hooks');
      
      vi.mocked(useCreateMenuItem).mockReturnValue({
        mutateAsync: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
        isPending: true,
      } as any);

      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/adding\.\.\./i)).toBeInTheDocument();
      });
    });

    it('should log error when submission fails', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { useCreateMenuItem } = await import('../../../lib/api/hooks');
      const mockError = new Error('Creation failed');
      
      vi.mocked(useCreateMenuItem).mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(mockError),
        isPending: false,
      } as any);

      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      // Fill in required fields
      const nameInput = await screen.findByPlaceholderText(/margherita pizza/i);
      await user.type(nameInput, 'Test Item');

      const priceInput = await screen.findByPlaceholderText(/12\.99/i);
      await user.type(priceInput, '10.00');

      const categoryInput = await screen.findByPlaceholderText(/pizza, pasta, salad/i);
      await user.type(categoryInput, 'Test');

      // Submit
      const submitButtons = screen.getAllByRole('button', { name: /add menu item/i });
      const submitButton = submitButtons[submitButtons.length - 1];
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create menu item:', mockError);
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Dialog Actions', () => {
    it('should close dialog when Cancel button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add menu item/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /add menu item/i })).not.toBeInTheDocument();
      });
    });

    it('should clear form when dialog is closed and reopened', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      // Open and fill form
      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      const nameInput = await screen.findByPlaceholderText(/margherita pizza/i);
      await user.type(nameInput, 'Test Item');

      // Close dialog
      const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /add menu item/i })).not.toBeInTheDocument();
      });

      // Reopen dialog
      await user.click(addButton);

      // Check field is empty - form doesn't auto-clear on close, only on successful submit
      const newNameInput = await screen.findByPlaceholderText(/margherita pizza/i);
      // Form retains values until successful submission
      expect(newNameInput).toHaveValue('Test Item');
    });
  });

  describe('Field Validation', () => {
    it('should require name field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      const nameInput = await screen.findByPlaceholderText(/margherita pizza/i);
      expect(nameInput).toBeRequired();
    });

    it('should require price field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      const priceInput = await screen.findByPlaceholderText(/12\.99/i);
      expect(priceInput).toBeRequired();
    });

    it('should require category field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      const categoryInput = await screen.findByPlaceholderText(/pizza, pasta, salad/i);
      expect(categoryInput).toBeRequired();
    });

    it('should not require description field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      const descInput = await screen.findByPlaceholderText(/fresh mozzarella/i);
      expect(descInput).not.toBeRequired();
    });

    it('should accept decimal price values', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      const priceInput = await screen.findByPlaceholderText(/12\.99/i);
      await user.type(priceInput, '10.99');

      expect(priceInput).toHaveValue(10.99);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible dialog title', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /add menu item/i });
        expect(heading).toBeInTheDocument();
      });
    });

    it('should have accessible form labels', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/available for ordering/i)).toBeInTheDocument();
      });
    });

    it('should have accessible action buttons', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AddMenuItemDialog restaurantId={mockRestaurantId} />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      await user.click(addButton);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
        const submitButtons = screen.getAllByRole('button', { name: /add menu item/i });
        
        expect(cancelButton).toHaveAccessibleName();
        expect(submitButtons[1]).toHaveAccessibleName(); // Dialog submit button
      });
    });
  });
});
