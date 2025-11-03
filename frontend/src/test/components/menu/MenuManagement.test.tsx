import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/test-utils';
import MenuManagement from '../../../pages/MenuManagement';
import { createMockRestaurant, createMockMenuItem } from '../../utils/factories';
import type { MenuItem } from '../../../types';

// Mock hooks
vi.mock('../../../lib/api/hooks', async () => {
  const actual = await import('../../../lib/api/hooks');
  return {
    ...actual,
    useRestaurant: vi.fn(),
    useMenuItems: vi.fn(),
    useDeleteMenuItem: vi.fn(),
    useToggleMenuItemAvailability: vi.fn(),
  };
});

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await import('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: 'rest-1' })),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

describe('MenuManagement', () => {
  let mockMenuItems: MenuItem[];

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useRestaurant, useMenuItems, useDeleteMenuItem, useToggleMenuItemAvailability } = 
      await import('../../../lib/api/hooks');

    mockMenuItems = [
      createMockMenuItem({
        id: 'item-1',
        name: 'Margherita Pizza',
        description: 'Fresh mozzarella, tomato sauce, basil',
        price: 12.99,
        category: 'Pizza',
        available: true,
      }),
      createMockMenuItem({
        id: 'item-2',
        name: 'Pepperoni Pizza',
        description: 'Pepperoni, mozzarella, tomato sauce',
        price: 14.99,
        category: 'Pizza',
        available: true,
      }),
      createMockMenuItem({
        id: 'item-3',
        name: 'Caesar Salad',
        description: 'Romaine lettuce, parmesan, croutons',
        price: 8.99,
        category: 'Salad',
        available: false,
      }),
    ];

    vi.mocked(useRestaurant).mockReturnValue({
      data: createMockRestaurant({ id: 'rest-1', name: 'Pizza Palace' }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useMenuItems).mockReturnValue({
      data: mockMenuItems,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useDeleteMenuItem).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useToggleMenuItemAvailability).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering & Structure', () => {
    it('should render page title and restaurant name', () => {
      renderWithProviders(<MenuManagement />);

      expect(screen.getByRole('heading', { name: /menu management/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
    });

    it('should render back button', () => {
      renderWithProviders(<MenuManagement />);

      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeInTheDocument();
    });

    it('should render Add Menu Item button', () => {
      renderWithProviders(<MenuManagement />);

      const addButton = screen.getByRole('button', { name: /add menu item/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should display loading state when loading', async () => {
      const { useRestaurant } = await import('../../../lib/api/hooks');
      vi.mocked(useRestaurant).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<MenuManagement />);

      expect(screen.queryByRole('heading', { name: /menu management/i })).not.toBeInTheDocument();
    });

    it('should display restaurant not found message when restaurant is missing', async () => {
      const { useRestaurant } = await import('../../../lib/api/hooks');
      vi.mocked(useRestaurant).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<MenuManagement />);

      expect(screen.getByText(/restaurant not found/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', () => {
      renderWithProviders(<MenuManagement />);

      const searchInput = screen.getByPlaceholderText(/search menu items/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should filter menu items by name when searching', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MenuManagement />);

      const searchInput = screen.getByPlaceholderText(/search menu items/i);
      await user.type(searchInput, 'Margherita');

      await waitFor(() => {
        expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
        expect(screen.queryByText('Pepperoni Pizza')).not.toBeInTheDocument();
        expect(screen.queryByText('Caesar Salad')).not.toBeInTheDocument();
      });
    });

    it('should filter menu items by description when searching', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MenuManagement />);

      const searchInput = screen.getByPlaceholderText(/search menu items/i);
      await user.type(searchInput, 'Romaine');

      await waitFor(() => {
        expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
        expect(screen.queryByText('Margherita Pizza')).not.toBeInTheDocument();
      });
    });

    it('should be case-insensitive when searching', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MenuManagement />);

      const searchInput = screen.getByPlaceholderText(/search menu items/i);
      await user.type(searchInput, 'PIZZA');

      await waitFor(() => {
        expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
        expect(screen.getByText('Pepperoni Pizza')).toBeInTheDocument();
      });
    });
  });

  describe('Category Filtering', () => {
    it('should display All Categories button', () => {
      renderWithProviders(<MenuManagement />);

      expect(screen.getByRole('button', { name: /all categories/i })).toBeInTheDocument();
    });

    it('should display category buttons for each unique category', () => {
      renderWithProviders(<MenuManagement />);

      expect(screen.getByRole('button', { name: /^pizza$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^salad$/i })).toBeInTheDocument();
    });

    it('should filter menu items by category', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MenuManagement />);

      const pizzaButton = screen.getByRole('button', { name: /^pizza$/i });
      await user.click(pizzaButton);

      await waitFor(() => {
        expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
        expect(screen.getByText('Pepperoni Pizza')).toBeInTheDocument();
        expect(screen.queryByText('Caesar Salad')).not.toBeInTheDocument();
      });
    });

    it('should show all items when All Categories clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MenuManagement />);

      // First filter by Pizza
      const pizzaButton = screen.getByRole('button', { name: /^pizza$/i });
      await user.click(pizzaButton);

      // Then click All Categories
      const allButton = screen.getByRole('button', { name: /all categories/i });
      await user.click(allButton);

      await waitFor(() => {
        expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
        expect(screen.getByText('Pepperoni Pizza')).toBeInTheDocument();
        expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
      });
    });

    it('should combine search and category filters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MenuManagement />);

      // Filter by Pizza category
      const pizzaButton = screen.getByRole('button', { name: /^pizza$/i });
      await user.click(pizzaButton);

      // Search for Margherita
      const searchInput = screen.getByPlaceholderText(/search menu items/i);
      await user.type(searchInput, 'Margherita');

      await waitFor(() => {
        expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
        expect(screen.queryByText('Pepperoni Pizza')).not.toBeInTheDocument();
        expect(screen.queryByText('Caesar Salad')).not.toBeInTheDocument();
      });
    });
  });

  describe('Menu Item Display', () => {
    it('should display all menu items', () => {
      renderWithProviders(<MenuManagement />);

      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
      expect(screen.getByText('Pepperoni Pizza')).toBeInTheDocument();
      expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
    });

    it('should display menu item descriptions', () => {
      renderWithProviders(<MenuManagement />);

      expect(screen.getByText(/fresh mozzarella, tomato sauce, basil/i)).toBeInTheDocument();
      expect(screen.getByText(/pepperoni, mozzarella, tomato sauce/i)).toBeInTheDocument();
      expect(screen.getByText(/romaine lettuce, parmesan, croutons/i)).toBeInTheDocument();
    });

    it('should display menu item prices', () => {
      renderWithProviders(<MenuManagement />);

      expect(screen.getByText('12.99')).toBeInTheDocument();
      expect(screen.getByText('14.99')).toBeInTheDocument();
      expect(screen.getByText('8.99')).toBeInTheDocument();
    });

    it('should display availability badges', () => {
      renderWithProviders(<MenuManagement />);

      const availableBadges = screen.getAllByText('Available');
      expect(availableBadges.length).toBeGreaterThan(0); // Available badges for items + summary stat

      const unavailableBadge = screen.getByText('Unavailable');
      expect(unavailableBadge).toBeInTheDocument();
    });

    it('should display category badges', () => {
      renderWithProviders(<MenuManagement />);

      const pizzaBadges = screen.getAllByText(/^pizza$/i);
      expect(pizzaBadges.length).toBeGreaterThan(0);

      const saladBadges = screen.getAllByText(/^salad$/i);
      expect(saladBadges.length).toBeGreaterThan(0); // Category filter button + badge
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no menu items exist', async () => {
      const { useMenuItems } = await import('../../../lib/api/hooks');
      vi.mocked(useMenuItems).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      renderWithProviders(<MenuManagement />);

      expect(screen.getByText(/no menu items found/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first menu item to get started/i)).toBeInTheDocument();
    });

    it('should display empty state with filter message when search has no results', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MenuManagement />);

      const searchInput = screen.getByPlaceholderText(/search menu items/i);
      await user.type(searchInput, 'NonexistentItem');

      await waitFor(() => {
        expect(screen.getByText(/no menu items found/i)).toBeInTheDocument();
        expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Menu Item Actions', () => {
    it('should display Enable/Disable buttons for each item', () => {
      renderWithProviders(<MenuManagement />);

      const disableButtons = screen.getAllByRole('button', { name: /disable/i });
      expect(disableButtons).toHaveLength(2); // For available items

      const enableButton = screen.getByRole('button', { name: /enable/i });
      expect(enableButton).toBeInTheDocument(); // For unavailable item
    });

    it('should call toggle availability when Enable/Disable clicked', async () => {
      const user = userEvent.setup();
      const { useToggleMenuItemAvailability } = await import('../../../lib/api/hooks');
      const mockMutate = vi.fn();
      
      vi.mocked(useToggleMenuItemAvailability).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      renderWithProviders(<MenuManagement />);

      const disableButtons = screen.getAllByRole('button', { name: /disable/i });
      await user.click(disableButtons[0]);

      expect(mockMutate).toHaveBeenCalledWith({
        restaurantId: 'rest-1',
        itemId: 'item-1',
        available: false,
      });
    });

    it('should display delete buttons for each item', () => {
      renderWithProviders(<MenuManagement />);

      // Delete buttons are ghost variant buttons with red text
      const allButtons = screen.getAllByRole('button');
      const deleteButtons = allButtons.filter(btn => 
        btn.classList.contains('text-red-600')
      );
      expect(deleteButtons.length).toBe(3);
    });

    it('should open delete confirmation when delete clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MenuManagement />);

      const allButtons = screen.getAllByRole('button');
      const deleteButtons = allButtons.filter(btn => 
        btn.classList.contains('text-red-600')
      );
      
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/delete menu item/i)).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to delete this menu item/i)).toBeInTheDocument();
      });
    });

    it('should call delete mutation when confirmed', async () => {
      const user = userEvent.setup();
      const { useDeleteMenuItem } = await import('../../../lib/api/hooks');
      const mockMutate = vi.fn();
      
      vi.mocked(useDeleteMenuItem).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      renderWithProviders(<MenuManagement />);

      // Click delete button
      const allButtons = screen.getAllByRole('button');
      const deleteButtons = allButtons.filter(btn => 
        btn.classList.contains('text-red-600')
      );
      
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/delete menu item/i)).toBeInTheDocument();
      });

      // Click Delete Item button in confirmation dialog
      const confirmButton = screen.getByRole('button', { name: /delete item/i });
      await user.click(confirmButton);

      expect(mockMutate).toHaveBeenCalledWith({
        restaurantId: 'rest-1',
        itemId: 'item-1',
      });
    });

    it('should close delete confirmation when Cancel clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MenuManagement />);

      // Click delete button
      const allButtons = screen.getAllByRole('button');
      const deleteButtons = allButtons.filter(btn => 
        btn.classList.contains('text-red-600')
      );
      
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/delete menu item/i)).toBeInTheDocument();
      });

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/delete menu item/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Summary Statistics', () => {
    it('should display total items count', () => {
      renderWithProviders(<MenuManagement />);

      expect(screen.getByText('Total Items')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display available items count', () => {
      renderWithProviders(<MenuManagement />);

      // Find the summary card section
      const availableLabels = screen.getAllByText('Available');
      expect(availableLabels.length).toBeGreaterThan(0); // Should include summary stat label
      const twos = screen.getAllByText('2');
      expect(twos.length).toBeGreaterThanOrEqual(2); // Both Available and Categories show "2"
    });

    it('should display categories count', () => {
      renderWithProviders(<MenuManagement />);

      expect(screen.getByText('Categories')).toBeInTheDocument();
      // Both Available (2) and Categories (2) show "2", use getAllByText
      const twos = screen.getAllByText('2');
      expect(twos.length).toBeGreaterThanOrEqual(2); // Pizza and Salad
    });
  });

  describe('Navigation', () => {
    it('should navigate back when Back button clicked', async () => {
      const user = userEvent.setup();
      const { useNavigate } = await import('react-router-dom');
      const mockNavigate = vi.fn();
      vi.mocked(useNavigate).mockReturnValue(mockNavigate);

      renderWithProviders(<MenuManagement />);

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/restaurants/rest-1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithProviders(<MenuManagement />);

      const h1 = screen.getByRole('heading', { name: /menu management/i, level: 1 });
      expect(h1).toBeInTheDocument();

      const summaryHeading = screen.getByText('Summary');
      expect(summaryHeading).toBeInTheDocument();
    });

    it('should have accessible search input', () => {
      renderWithProviders(<MenuManagement />);

      const searchInput = screen.getByPlaceholderText(/search menu items/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      renderWithProviders(<MenuManagement />);

      expect(screen.getByRole('button', { name: /back/i })).toHaveAccessibleName();
      expect(screen.getByRole('button', { name: /add menu item/i })).toHaveAccessibleName();
      expect(screen.getByRole('button', { name: /all categories/i })).toHaveAccessibleName();
    });
  });
});
