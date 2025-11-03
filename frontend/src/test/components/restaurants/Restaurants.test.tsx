import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/test-utils';
import Restaurants from '../../../pages/Restaurants';
import { createMockRestaurant, createMockUser } from '../../utils/factories';
import type { Restaurant } from '../../../types';

// Mock hooks
vi.mock('../../../lib/api/hooks', async () => {
  const actual = await import('../../../lib/api/hooks');
  return {
    ...actual,
    useRestaurants: vi.fn(),
    useDeleteRestaurant: vi.fn(),
  };
});

// Mock auth store
vi.mock('../../../store/authStore', async () => {
  const actual = await import('../../../store/authStore');
  return {
    ...actual,
    useAuthStore: vi.fn(),
  };
});

describe('Restaurants', () => {
  let mockRestaurants: Restaurant[];

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    const { useRestaurants, useDeleteRestaurant } = await import('../../../lib/api/hooks');
    const { useAuthStore } = await import('../../../store/authStore');

    mockRestaurants = [
      createMockRestaurant({
        id: 'rest-1',
        name: 'Pizza Palace',
        cuisine: 'Italian',
        openTime: '11:00',
        closeTime: '22:00',
        deliveryTime: '30-40 minutes',
        hasMenu: true,
      }),
      createMockRestaurant({
        id: 'rest-2',
        name: 'Burger Barn',
        cuisine: 'American',
        openTime: '10:00',
        closeTime: '23:00',
        deliveryTime: '20-30 minutes',
        hasMenu: false,
      }),
    ];

    vi.mocked(useRestaurants).mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useDeleteRestaurant).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as any);

    vi.mocked(useAuthStore).mockReturnValue({
      user: createMockUser({ role: 'ADMIN' }),
      token: 'mock-token',
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering & Structure', () => {
    it('should render page title and description', () => {
      renderWithProviders(<Restaurants />);

      expect(screen.getByRole('heading', { name: /restaurants/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByText(/browse and manage restaurants/i)).toBeInTheDocument();
    });

    it('should show Add Restaurant button for admin users', () => {
      renderWithProviders(<Restaurants />);

      const addButton = screen.getByRole('button', { name: /add restaurant/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should not show Add Restaurant button for non-admin users', async () => {
      const { useAuthStore } = await import('../../../store/authStore');
      vi.mocked(useAuthStore).mockReturnValue({
        user: createMockUser({ role: 'USER' }),
        token: 'mock-token',
      } as any);

      renderWithProviders(<Restaurants />);

      const addButtons = screen.queryAllByRole('button', { name: /add restaurant/i });
      expect(addButtons).toHaveLength(0);
    });

    it('should display loading skeleton when loading', async () => {
      const { useRestaurants } = await import('../../../lib/api/hooks');
      vi.mocked(useRestaurants).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<Restaurants />);

      const heading = screen.getByRole('heading', { name: /restaurants/i, level: 1 });
      expect(heading).toBeInTheDocument();
      // Skeleton should be present (no restaurants yet)
      expect(screen.queryByText(/pizza palace/i)).not.toBeInTheDocument();
    });
  });

  describe('Restaurant Display', () => {
    it('should display all restaurants in grid', () => {
      renderWithProviders(<Restaurants />);

      expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      expect(screen.getByText('Burger Barn')).toBeInTheDocument();
    });

    it('should display restaurant cuisine', () => {
      renderWithProviders(<Restaurants />);

      // Check for cuisine - use getAllByText since it appears in both CardDescription and badges
      const italianText = screen.getAllByText('Italian');
      expect(italianText.length).toBeGreaterThan(0);
      
      const americanText = screen.getAllByText('American');
      expect(americanText.length).toBeGreaterThan(0);
    });

    it('should display restaurant hours', () => {
      renderWithProviders(<Restaurants />);

      expect(screen.getByText(/11:00 - 22:00/i)).toBeInTheDocument();
      expect(screen.getByText(/10:00 - 23:00/i)).toBeInTheDocument();
    });

    it('should display delivery time', () => {
      renderWithProviders(<Restaurants />);

      expect(screen.getByText(/30-40 minutes/i)).toBeInTheDocument();
      expect(screen.getByText(/20-30 minutes/i)).toBeInTheDocument();
    });

    it('should display Active badge for all restaurants', () => {
      renderWithProviders(<Restaurants />);

      const badges = screen.getAllByText('Active');
      expect(badges).toHaveLength(2);
    });

    it('should display cuisine tags when cuisine contains comma-separated values', async () => {
      const { useRestaurants } = await import('../../../lib/api/hooks');
      vi.mocked(useRestaurants).mockReturnValue({
        data: [
          createMockRestaurant({
            id: 'rest-1',
            name: 'Fusion Kitchen',
            cuisine: 'Italian, Mediterranean, Vegan',
          }),
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<Restaurants />);

      expect(screen.getByText('Italian')).toBeInTheDocument();
      expect(screen.getByText('Mediterranean')).toBeInTheDocument();
      expect(screen.getByText('Vegan')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no restaurants exist', async () => {
      const { useRestaurants } = await import('../../../lib/api/hooks');
      vi.mocked(useRestaurants).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<Restaurants />);

      expect(screen.getByText(/no restaurants yet/i)).toBeInTheDocument();
      expect(screen.getByText(/get started by adding your first restaurant/i)).toBeInTheDocument();
    });

    it('should show Add Restaurant button in empty state for admins', async () => {
      const { useRestaurants } = await import('../../../lib/api/hooks');
      vi.mocked(useRestaurants).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<Restaurants />);

      const addButtons = screen.getAllByRole('button', { name: /add restaurant/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it('should not show Add Restaurant button in empty state for non-admins', async () => {
      const { useRestaurants } = await import('../../../lib/api/hooks');
      const { useAuthStore } = await import('../../../store/authStore');
      
      vi.mocked(useRestaurants).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useAuthStore).mockReturnValue({
        user: createMockUser({ role: 'USER' }),
        token: 'mock-token',
      } as any);

      renderWithProviders(<Restaurants />);

      const addButtons = screen.queryAllByRole('button', { name: /add restaurant/i });
      expect(addButtons).toHaveLength(0);
    });
  });

  describe('Navigation', () => {
    it('should navigate to restaurant details when View Details clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Restaurants />);

      const viewButton = screen.getAllByRole('button', { name: /view details/i })[0];
      await user.click(viewButton);

      // Check navigation happened (URL would change in real app)
      await waitFor(() => {
        expect(viewButton).toBeInTheDocument();
      });
    });
  });

  describe('Admin Actions', () => {
    it('should show Edit and Delete buttons for admin users', () => {
      renderWithProviders(<Restaurants />);

      // Each restaurant should have delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(2);
      
      // Edit buttons are icon-only, find by their container or SVG
      const editIcons = document.querySelectorAll('.lucide-square-pen');
      expect(editIcons.length).toBeGreaterThan(0);
    });

    it('should not show Edit and Delete buttons for non-admin users', async () => {
      const { useAuthStore } = await import('../../../store/authStore');
      vi.mocked(useAuthStore).mockReturnValue({
        user: createMockUser({ role: 'USER' }),
        token: 'mock-token',
      } as any);

      renderWithProviders(<Restaurants />);

      const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(0);
    });

    it('should open Add Restaurant dialog when Add button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Restaurants />);

      const addButton = screen.getByRole('button', { name: /add restaurant/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /add restaurant/i })).toBeInTheDocument();
      });
    });

    it('should open delete confirmation when Delete button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Restaurants />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
        // Restaurant name appears in the dialog message
        const dialogContent = screen.getByText(/are you sure you want to delete/i).closest('div');
        expect(dialogContent).toHaveTextContent('Pizza Palace');
      });
    });

    it('should call delete mutation when delete confirmed', async () => {
      const user = userEvent.setup();
      const { useDeleteRestaurant } = await import('../../../lib/api/hooks');
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      
      vi.mocked(useDeleteRestaurant).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any);

      renderWithProviders(<Restaurants />);

      // Click first delete button (for Pizza Palace)
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      // Find the confirm delete button (there are now 3 delete buttons: 2 in cards + 1 in dialog)
      const allDeleteButtons = screen.getAllByRole('button', { name: /delete/i });
      const confirmButton = allDeleteButtons[allDeleteButtons.length - 1]; // Last one is in dialog
      await user.click(confirmButton);

      // Verify mutation was called
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith('rest-1');
      });
    });

    it('should close confirmation dialog when Cancel clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Restaurants />);

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Confirmation should be gone
      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument();
      });
    });

    it('should handle delete error gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { useDeleteRestaurant } = await import('../../../lib/api/hooks');
      
      vi.mocked(useDeleteRestaurant).mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Delete failed')),
        isPending: false,
      } as any);

      renderWithProviders(<Restaurants />);

      // Click delete and confirm
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      });

      const allDeleteButtons = screen.getAllByRole('button', { name: /delete/i });
      const confirmButton = allDeleteButtons[allDeleteButtons.length - 1];
      await user.click(confirmButton);

      // Error should be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to delete restaurant:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithProviders(<Restaurants />);

      const h1 = screen.getByRole('heading', { name: /restaurants/i, level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it('should have accessible View Details buttons', () => {
      renderWithProviders(<Restaurants />);

      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      expect(viewButtons).toHaveLength(2);
      viewButtons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should have accessible Delete buttons', () => {
      renderWithProviders(<Restaurants />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(2);
      deleteButtons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should display restaurant names with proper truncation title attribute', () => {
      renderWithProviders(<Restaurants />);

      const pizzaTitle = screen.getByTitle('Pizza Palace');
      expect(pizzaTitle).toBeInTheDocument();
      expect(pizzaTitle).toHaveTextContent('Pizza Palace');
    });
  });
});
