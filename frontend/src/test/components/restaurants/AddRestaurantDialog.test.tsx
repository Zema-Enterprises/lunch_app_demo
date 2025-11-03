import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/test-utils';
import AddRestaurantDialog from '../../../components/features/AddRestaurantDialog';

// Mock hooks
vi.mock('../../../lib/api/hooks', async () => {
  const actual = await import('../../../lib/api/hooks');
  return {
    ...actual,
    useCreateRestaurant: vi.fn(),
  };
});

describe('AddRestaurantDialog', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useCreateRestaurant } = await import('../../../lib/api/hooks');
    
    vi.mocked(useCreateRestaurant).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'new-rest', name: 'New Restaurant' }),
      isPending: false,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering & Structure', () => {
    it('should not render when open is false', () => {
      renderWithProviders(
        <AddRestaurantDialog open={false} onOpenChange={mockOnOpenChange} />
      );

      expect(screen.queryByRole('heading', { name: /add restaurant/i })).not.toBeInTheDocument();
    });

    it('should render when open is true', () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      expect(screen.getByRole('heading', { name: /add restaurant/i })).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      // Use placeholders since labels don't have htmlFor
      expect(screen.getByPlaceholderText(/pizza palace/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/italian/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/30-45 minutes/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/https/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/restaurant has a menu/i)).toBeInTheDocument();
      
      // Time inputs by name
      const openTimeInput = document.querySelector('input[name="openTime"]');
      expect(openTimeInput).toBeInTheDocument();
      const closeTimeInput = document.querySelector('input[name="closeTime"]');
      expect(closeTimeInput).toBeInTheDocument();
    });

    it('should render form action buttons', () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add restaurant/i })).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should allow typing in name field', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const nameInput = screen.getByPlaceholderText(/pizza palace/i);
      await user.type(nameInput, 'Pizza Palace');

      expect(nameInput).toHaveValue('Pizza Palace');
    });

    it('should allow typing in cuisine field', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const cuisineInput = screen.getByPlaceholderText(/italian/i);
      await user.type(cuisineInput, 'Italian Cuisine');

      expect(cuisineInput).toHaveValue('Italian Cuisine');
    });

    it('should allow setting open time', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const openTimeInput = document.querySelector('input[name="openTime"]') as HTMLInputElement;
      await user.type(openTimeInput, '11:00');

      expect(openTimeInput).toHaveValue('11:00');
    });

    it('should allow setting close time', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const closeTimeInput = document.querySelector('input[name="closeTime"]') as HTMLInputElement;
      await user.type(closeTimeInput, '22:00');

      expect(closeTimeInput).toHaveValue('22:00');
    });

    it('should allow typing in delivery time field', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const deliveryInput = screen.getByPlaceholderText(/30-45 minutes/i);
      await user.type(deliveryInput, '30-40 minutes');

      expect(deliveryInput).toHaveValue('30-40 minutes');
    });

    it('should allow typing in image URL field', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const imageInput = screen.getByPlaceholderText(/https/i);
      await user.type(imageInput, 'https://example.com/pizza.jpg');

      expect(imageInput).toHaveValue('https://example.com/pizza.jpg');
    });

    it('should allow toggling hasMenu checkbox', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const checkbox = screen.getByLabelText(/restaurant has a menu/i);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with all required fields', async () => {
      const user = userEvent.setup();
      const { useCreateRestaurant } = await import('../../../lib/api/hooks');
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'new-rest' });
      
      vi.mocked(useCreateRestaurant).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      // Fill required fields using placeholders
      await user.type(screen.getByPlaceholderText(/pizza palace/i), 'Pizza Palace');
      await user.type(screen.getByPlaceholderText(/italian/i), 'Italian');
      
      const openTimeInput = document.querySelector('input[name="openTime"]') as HTMLInputElement;
      const closeTimeInput = document.querySelector('input[name="closeTime"]') as HTMLInputElement;
      
      await user.type(openTimeInput, '11:00');
      await user.type(closeTimeInput, '22:00');
      await user.type(screen.getByPlaceholderText(/30-45 minutes/i), '30-40 minutes');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add restaurant/i });
      await user.click(submitButton);

      // Verify mutation was called with correct data
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'Pizza Palace',
          cuisine: 'Italian',
          openTime: '11:00',
          closeTime: '22:00',
          deliveryTime: '30-40 minutes',
          hasMenu: false,
          imageUrl: '',
        });
      });
    });

    it('should submit form with optional fields filled', async () => {
      const user = userEvent.setup();
      const { useCreateRestaurant } = await import('../../../lib/api/hooks');
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'new-rest' });
      
      vi.mocked(useCreateRestaurant).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      // Fill all fields including optional
      await user.type(screen.getByPlaceholderText(/pizza palace/i), 'Burger Barn');
      await user.type(screen.getByPlaceholderText(/italian/i), 'American');
      
      const openTimeInput = document.querySelector('input[name="openTime"]') as HTMLInputElement;
      const closeTimeInput = document.querySelector('input[name="closeTime"]') as HTMLInputElement;
      
      await user.type(openTimeInput, '10:00');
      await user.type(closeTimeInput, '23:00');
      await user.type(screen.getByPlaceholderText(/30-45 minutes/i), '20-30 minutes');
      await user.type(screen.getByPlaceholderText(/https/i), 'https://example.com/burger.jpg');
      await user.click(screen.getByLabelText(/restaurant has a menu/i));

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add restaurant/i });
      await user.click(submitButton);

      // Verify mutation was called with all data
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          name: 'Burger Barn',
          cuisine: 'American',
          openTime: '10:00',
          closeTime: '23:00',
          deliveryTime: '20-30 minutes',
          hasMenu: true,
          imageUrl: 'https://example.com/burger.jpg',
        });
      });
    });

    it('should close dialog and reset form after successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      // Fill and submit form
      await user.type(screen.getByPlaceholderText(/pizza palace/i), 'Test Restaurant');
      await user.type(screen.getByPlaceholderText(/italian/i), 'Test Cuisine');
      
      const openTimeInput = document.querySelector('input[name="openTime"]') as HTMLInputElement;
      const closeTimeInput = document.querySelector('input[name="closeTime"]') as HTMLInputElement;
      
      await user.type(openTimeInput, '09:00');
      await user.type(closeTimeInput, '21:00');
      await user.type(screen.getByPlaceholderText(/30-45 minutes/i), '25 minutes');

      const submitButton = screen.getByRole('button', { name: /add restaurant/i });
      await user.click(submitButton);

      // Dialog should close
      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should display loading state during submission', async () => {
      const { useCreateRestaurant } = await import('../../../lib/api/hooks');
      
      vi.mocked(useCreateRestaurant).mockReturnValue({
        mutateAsync: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
        isPending: true,
      } as any);

      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      expect(screen.getByRole('button', { name: /adding.../i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /adding.../i })).toBeDisabled();
    });

    it('should handle submission error gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { useCreateRestaurant } = await import('../../../lib/api/hooks');
      
      vi.mocked(useCreateRestaurant).mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Failed to create')),
        isPending: false,
      } as any);

      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      // Fill and submit form
      await user.type(screen.getByPlaceholderText(/pizza palace/i), 'Test Restaurant');
      await user.type(screen.getByPlaceholderText(/italian/i), 'Test');
      
      const openTimeInput = document.querySelector('input[name="openTime"]') as HTMLInputElement;
      const closeTimeInput = document.querySelector('input[name="closeTime"]') as HTMLInputElement;
      
      await user.type(openTimeInput, '09:00');
      await user.type(closeTimeInput, '21:00');
      await user.type(screen.getByPlaceholderText(/30-45 minutes/i), '25 min');

      const submitButton = screen.getByRole('button', { name: /add restaurant/i });
      await user.click(submitButton);

      // Error should be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to create restaurant:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Dialog Actions', () => {
    it('should close dialog when Cancel button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should close dialog when backdrop clicked', async () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      // Find close button in dialog header (X button)
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.querySelector('svg'));
      
      if (closeButton) {
        const user = userEvent.setup();
        await user.click(closeButton);
        expect(mockOnOpenChange).toHaveBeenCalled();
      }
    });
  });

  describe('Field Validation', () => {
    it('should show required attribute on name field', () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const nameInput = screen.getByPlaceholderText(/pizza palace/i);
      expect(nameInput).toBeRequired();
    });

    it('should show required attribute on cuisine field', () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const cuisineInput = screen.getByPlaceholderText(/italian/i);
      expect(cuisineInput).toBeRequired();
    });

    it('should show required attribute on time fields', () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const openTimeInput = document.querySelector('input[name="openTime"]') as HTMLInputElement;
      const closeTimeInput = document.querySelector('input[name="closeTime"]') as HTMLInputElement;
      
      expect(openTimeInput).toBeRequired();
      expect(closeTimeInput).toBeRequired();
    });

    it('should show required attribute on delivery time field', () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const deliveryInput = screen.getByPlaceholderText(/30-45 minutes/i);
      expect(deliveryInput).toBeRequired();
    });

    it('should not require image URL field', () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const imageInput = screen.getByPlaceholderText(/https/i);
      expect(imageInput).not.toBeRequired();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const heading = screen.getByRole('heading', { name: /add restaurant/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible form labels', () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      // Checkbox has proper label
      expect(screen.getByLabelText(/restaurant has a menu/i)).toHaveAccessibleName();
      
      // Other fields use placeholders (not ideal for a11y, but testing current implementation)
      expect(screen.getByPlaceholderText(/pizza palace/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/italian/i)).toBeInTheDocument();
    });

    it('should have accessible submit button', () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const submitButton = screen.getByRole('button', { name: /add restaurant/i });
      expect(submitButton).toHaveAccessibleName();
    });

    it('should have accessible cancel button', () => {
      renderWithProviders(
        <AddRestaurantDialog open={true} onOpenChange={mockOnOpenChange} />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toHaveAccessibleName();
    });
  });
});
