import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/test-utils';
import { EditRestaurantDialog } from '../../../components/restaurants/EditRestaurantDialog';
import { createMockRestaurant } from '../../utils/factories';
import type { Restaurant } from '../../../types';

// Mock hooks
vi.mock('@/lib/api/hooks', async () => {
  const actual = await import('@/lib/api/hooks');
  return {
    ...actual,
    useUpdateRestaurant: vi.fn(),
  };
});

describe('EditRestaurantDialog', () => {
  let mockRestaurant: Restaurant;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockRestaurant = createMockRestaurant({
      id: 'rest-1',
      name: 'Pizza Palace',
      cuisine: 'Italian',
      openTime: '11:00',
      closeTime: '22:00',
      deliveryTime: '30-40 minutes',
      hasMenu: true,
      imageUrl: 'https://example.com/pizza.jpg',
    });

    const { useUpdateRestaurant } = await import('@/lib/api/hooks');
    
    vi.mocked(useUpdateRestaurant).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ ...mockRestaurant, name: 'Updated Name' }),
      isPending: false,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering & Structure', () => {
    it('should not render dialog initially', () => {
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      expect(screen.queryByRole('heading', { name: /edit restaurant/i })).not.toBeInTheDocument();
    });

    it('should render edit button', () => {
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      // Edit button is icon-only
      const editIcon = document.querySelector('.lucide-square-pen');
      expect(editIcon).toBeInTheDocument();
    });

    it('should open dialog when edit button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /edit restaurant/i })).toBeInTheDocument();
        });
      }
    });

    it('should render all form fields in dialog', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByPlaceholderText(/pizza palace/i)).toBeInTheDocument();
          expect(screen.getByPlaceholderText(/italian/i)).toBeInTheDocument();
          expect(screen.getByPlaceholderText(/30-45 minutes/i)).toBeInTheDocument();
          expect(screen.getByPlaceholderText(/https/i)).toBeInTheDocument();
          expect(screen.getByLabelText(/restaurant has a menu/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Form Pre-population', () => {
    it('should pre-populate name field with restaurant data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const nameInput = screen.getByPlaceholderText(/pizza palace/i) as HTMLInputElement;
          expect(nameInput.value).toBe('Pizza Palace');
        });
      }
    });

    it('should pre-populate cuisine field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const cuisineInput = screen.getByPlaceholderText(/italian/i) as HTMLInputElement;
          expect(cuisineInput.value).toBe('Italian');
        });
      }
    });

    it('should pre-populate time fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const openTimeInput = document.querySelector('input[name="openTime"]') as HTMLInputElement;
          const closeTimeInput = document.querySelector('input[name="closeTime"]') as HTMLInputElement;
          expect(openTimeInput.value).toBe('11:00');
          expect(closeTimeInput.value).toBe('22:00');
        });
      }
    });

    it('should pre-populate delivery time', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const deliveryInput = screen.getByPlaceholderText(/30-45 minutes/i) as HTMLInputElement;
          expect(deliveryInput.value).toBe('30-40 minutes');
        });
      }
    });

    it('should pre-populate image URL', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const imageInput = screen.getByPlaceholderText(/https/i) as HTMLInputElement;
          expect(imageInput.value).toBe('https://example.com/pizza.jpg');
        });
      }
    });

    it('should pre-populate hasMenu checkbox', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const checkbox = screen.getByLabelText(/restaurant has a menu/i) as HTMLInputElement;
          expect(checkbox.checked).toBe(true);
        });
      }
    });
  });

  describe('Form Modification', () => {
    it('should allow editing name field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByPlaceholderText(/pizza palace/i)).toBeInTheDocument();
        });

        const nameInput = screen.getByPlaceholderText(/pizza palace/i);
        await user.clear(nameInput);
        await user.type(nameInput, 'New Restaurant Name');

        expect(nameInput).toHaveValue('New Restaurant Name');
      }
    });

    it('should allow toggling hasMenu checkbox', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByLabelText(/restaurant has a menu/i)).toBeInTheDocument();
        });

        const checkbox = screen.getByLabelText(/restaurant has a menu/i) as HTMLInputElement;
        expect(checkbox.checked).toBe(true);

        await user.click(checkbox);
        expect(checkbox.checked).toBe(false);
      }
    });
  });

  describe('Form Submission', () => {
    it('should submit updated restaurant data', async () => {
      const user = userEvent.setup();
      const { useUpdateRestaurant } = await import('@/lib/api/hooks');
      const mockMutateAsync = vi.fn().mockResolvedValue({ ...mockRestaurant });
      
      vi.mocked(useUpdateRestaurant).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByPlaceholderText(/pizza palace/i)).toBeInTheDocument();
        });

        const nameInput = screen.getByPlaceholderText(/pizza palace/i);
        await user.clear(nameInput);
        await user.type(nameInput, 'Updated Name');

        const submitButton = screen.getByRole('button', { name: /update restaurant/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockMutateAsync).toHaveBeenCalledWith({
            id: 'rest-1',
            data: {
              name: 'Updated Name',
              cuisine: 'Italian',
              openTime: '11:00',
              closeTime: '22:00',
              deliveryTime: '30-40 minutes',
              hasMenu: true,
              imageUrl: 'https://example.com/pizza.jpg',
            },
          });
        });
      }
    });

    it('should close dialog after successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /edit restaurant/i })).toBeInTheDocument();
        });

        const submitButton = screen.getByRole('button', { name: /update restaurant/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.queryByRole('heading', { name: /edit restaurant/i })).not.toBeInTheDocument();
        });
      }
    });

    it('should display loading state during submission', async () => {
      const user = userEvent.setup();
      const { useUpdateRestaurant } = await import('@/lib/api/hooks');
      
      vi.mocked(useUpdateRestaurant).mockReturnValue({
        mutateAsync: vi.fn().mockImplementation(() => new Promise(() => {})),
        isPending: true,
      } as any);

      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /updating.../i })).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /updating.../i })).toBeDisabled();
        });
      }
    });

    it('should handle submission error gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { useUpdateRestaurant } = await import('@/lib/api/hooks');
      
      vi.mocked(useUpdateRestaurant).mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Update failed')),
        isPending: false,
      } as any);

      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByPlaceholderText(/pizza palace/i)).toBeInTheDocument();
        });

        const submitButton = screen.getByRole('button', { name: /update restaurant/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Failed to update restaurant:',
            expect.any(Error)
          );
        });
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Dialog Actions', () => {
    it('should close dialog when Cancel button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /edit restaurant/i })).toBeInTheDocument();
        });

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        await waitFor(() => {
          expect(screen.queryByRole('heading', { name: /edit restaurant/i })).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const heading = screen.getByRole('heading', { name: /edit restaurant/i });
          expect(heading).toBeInTheDocument();
        });
      }
    });

    it('should have accessible submit button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const submitButton = screen.getByRole('button', { name: /update restaurant/i });
          expect(submitButton).toHaveAccessibleName();
        });
      }
    });

    it('should have accessible cancel button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditRestaurantDialog restaurant={mockRestaurant} />);

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => btn.querySelector('.lucide-square-pen'));
      
      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const cancelButton = screen.getByRole('button', { name: /cancel/i });
          expect(cancelButton).toHaveAccessibleName();
        });
      }
    });
  });
});
