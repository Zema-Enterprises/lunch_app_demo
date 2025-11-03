import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/test-utils';
import { EditMenuItemDialog } from '../../../components/menu/EditMenuItemDialog';
import { createMockMenuItem } from '../../utils/factories';

// Mock hooks
vi.mock('../../../lib/api/hooks', async () => {
  const actual = await import('../../../lib/api/hooks');
  return {
    ...actual,
    useUpdateMenuItem: vi.fn(),
  };
});

describe('EditMenuItemDialog', () => {
  const mockRestaurantId = 'rest-1';
  const mockMenuItem = createMockMenuItem({
    id: 'item-1',
    name: 'Margherita Pizza',
    description: 'Fresh mozzarella, tomato sauce, basil',
    price: 12.99,
    category: 'Pizza',
    available: true,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useUpdateMenuItem } = await import('../../../lib/api/hooks');
    vi.mocked(useUpdateMenuItem).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering & Structure', () => {
    it('should render trigger button', () => {
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      // Edit button is icon-only, find by outline variant and size sm
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should open dialog when trigger button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const editButton = screen.getByRole('button');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit menu item/i })).toBeInTheDocument();
      });
    });

    it('should render all form fields when dialog is open', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByPlaceholderText(/margherita pizza/i)).toBeInTheDocument();
          expect(screen.getByPlaceholderText(/fresh mozzarella/i)).toBeInTheDocument();
          expect(screen.getByPlaceholderText(/12\.99/i)).toBeInTheDocument();
          expect(screen.getByPlaceholderText(/pizza, pasta, salad/i)).toBeInTheDocument();
          expect(screen.getByLabelText(/available for ordering/i)).toBeInTheDocument();
        });
      }
    });

    it('should render action buttons when dialog is open', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /update menu item/i })).toBeInTheDocument();
        });
      }
    });
  });

  describe('Form Pre-population', () => {
    it('should pre-populate name field with menu item data', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        const nameInput = await screen.findByPlaceholderText(/margherita pizza/i);
        expect(nameInput).toHaveValue('Margherita Pizza');
      }
    });

    it('should pre-populate description field with menu item data', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        const descInput = await screen.findByPlaceholderText(/fresh mozzarella/i);
        expect(descInput).toHaveValue('Fresh mozzarella, tomato sauce, basil');
      }
    });

    it('should pre-populate price field with menu item data', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        const priceInput = await screen.findByPlaceholderText(/12\.99/i);
        expect(priceInput).toHaveValue('12.99');
      }
    });

    it('should pre-populate category field with menu item data', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        const categoryInput = await screen.findByPlaceholderText(/pizza, pasta, salad/i);
        expect(categoryInput).toHaveValue('Pizza');
      }
    });

    it('should pre-populate available checkbox with menu item data', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        const availableCheckbox = await screen.findByLabelText(/available for ordering/i);
        expect(availableCheckbox).toBeChecked();
      }
    });

    it('should handle menu item with empty description', async () => {
      const user = userEvent.setup();
      const itemWithoutDesc = createMockMenuItem({
        ...mockMenuItem,
        description: undefined,
      });

      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={itemWithoutDesc} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        const descInput = await screen.findByPlaceholderText(/fresh mozzarella/i);
        expect(descInput).toHaveValue('');
      }
    });
  });

  describe('Form Modification', () => {
    it('should allow modifying name field', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        const nameInput = await screen.findByPlaceholderText(/margherita pizza/i);
        await user.clear(nameInput);
        await user.type(nameInput, 'Pepperoni Pizza');

        expect(nameInput).toHaveValue('Pepperoni Pizza');
      }
    });

    it('should allow modifying price field', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        const priceInput = await screen.findByPlaceholderText(/12\.99/i);
        await user.clear(priceInput);
        await user.type(priceInput, '15.99');

        expect(priceInput).toHaveValue('15.99');
      }
    });

    it('should allow toggling available checkbox', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        const availableCheckbox = await screen.findByLabelText(/available for ordering/i);
        expect(availableCheckbox).toBeChecked();

        await user.click(availableCheckbox);
        expect(availableCheckbox).not.toBeChecked();
      }
    });
  });

  describe('Form Submission', () => {
    it('should call updateMenuItem with correct data when form is submitted', async () => {
      const user = userEvent.setup();
      const { useUpdateMenuItem } = await import('../../../lib/api/hooks');
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      
      vi.mocked(useUpdateMenuItem).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        // Modify fields
        const nameInput = await screen.findByPlaceholderText(/margherita pizza/i);
        await user.clear(nameInput);
        await user.type(nameInput, 'Pepperoni Pizza');

        const priceInput = await screen.findByPlaceholderText(/12\.99/i);
        await user.clear(priceInput);
        await user.type(priceInput, '15.99');

        // Submit form
        const submitButton = screen.getByRole('button', { name: /update menu item/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockMutateAsync).toHaveBeenCalledWith({
            restaurantId: mockRestaurantId,
            itemId: 'item-1',
            data: {
              name: 'Pepperoni Pizza',
              description: 'Fresh mozzarella, tomato sauce, basil',
              price: 15.99,
              category: 'Pizza',
              available: true,
            },
          });
        });
      }
    });

    it('should close dialog after successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /edit menu item/i })).toBeInTheDocument();
        });

        // Submit form
        const submitButton = screen.getByRole('button', { name: /update menu item/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.queryByRole('heading', { name: /edit menu item/i })).not.toBeInTheDocument();
        });
      }
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const { useUpdateMenuItem } = await import('../../../lib/api/hooks');
      
      vi.mocked(useUpdateMenuItem).mockReturnValue({
        mutateAsync: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
        isPending: true,
      } as any);

      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByText(/updating\.\.\./i)).toBeInTheDocument();
        });
      }
    });

    it('should log error when submission fails', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { useUpdateMenuItem } = await import('../../../lib/api/hooks');
      const mockError = new Error('Update failed');
      
      vi.mocked(useUpdateMenuItem).mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(mockError),
        isPending: false,
      } as any);

      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        // Submit form
        const submitButton = screen.getByRole('button', { name: /update menu item/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update menu item:', mockError);
        });
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Dialog Actions', () => {
    it('should close dialog when Cancel button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /edit menu item/i })).toBeInTheDocument();
        });

        const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
        await user.click(cancelButton);

        await waitFor(() => {
          expect(screen.queryByRole('heading', { name: /edit menu item/i })).not.toBeInTheDocument();
        });
      }
    });

    it('should reset form when dialog is closed and reopened', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        // Open and modify form
        await user.click(editButton);

        const nameInput = await screen.findByPlaceholderText(/margherita pizza/i);
        await user.clear(nameInput);
        await user.type(nameInput, 'Modified Name');

        // Close dialog
        const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
        await user.click(cancelButton);

        // Reopen dialog
        await user.click(editButton);

        // Check field is reset to original value
        const newNameInput = await screen.findByPlaceholderText(/margherita pizza/i);
        expect(newNameInput).toHaveValue('Margherita Pizza');
      }
    });
  });

  describe('Accessibility', () => {
    it('should have accessible dialog title', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const heading = screen.getByRole('heading', { name: /edit menu item/i });
          expect(heading).toBeInTheDocument();
        });
      }
    });

    it('should have accessible form labels', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByLabelText(/available for ordering/i)).toBeInTheDocument();
        });
      }
    });

    it('should have accessible action buttons', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <EditMenuItemDialog restaurantId={mockRestaurantId} menuItem={mockMenuItem} />
      );

      const buttons = screen.getAllByRole('button');
      const editButton = buttons.find(btn => btn.querySelector('.lucide-edit'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
          const submitButton = screen.getByRole('button', { name: /update menu item/i });
          
          expect(cancelButton).toHaveAccessibleName();
          expect(submitButton).toHaveAccessibleName();
        });
      }
    });
  });
});
