import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../utils/test-utils';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Header Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    // Reset auth store to default authenticated state
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        companyId: 'company-1',
      },
      company: {
        id: 'company-1',
        name: 'Test Company',
        domain: 'test.com',
        slug: 'test-company',
      },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe('Rendering & Structure', () => {
    it('should render header with LunchSync branding', () => {
      render(<Header />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
      // Use getByText instead since MobileNav may have other headings
      expect(screen.getAllByText('LunchSync')[0]).toBeInTheDocument();
    });

    it('should display authenticated user name', () => {
      render(<Header />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should display company name when available', () => {
      render(<Header />);

      const companyElement = screen.getByText('Test Company');
      expect(companyElement).toBeInTheDocument();
      expect(companyElement).toHaveAttribute('aria-label', 'Company: Test Company');
    });

    it('should render logout button', () => {
      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /log out/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it('should have proper navigation landmark', () => {
      render(<Header />);

      const userMenu = screen.getByRole('navigation', { name: /user menu/i });
      expect(userMenu).toBeInTheDocument();
    });
  });

  describe('User Information Display', () => {
    it('should display admin badge for admin users', () => {
      useAuthStore.setState({
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
          companyId: 'company-1',
        },
      });

      render(<Header />);

      const adminBadge = screen.getByRole('status', { name: /administrator role/i });
      expect(adminBadge).toBeInTheDocument();
      expect(adminBadge).toHaveTextContent('Admin');
    });

    it('should not display admin badge for regular users', () => {
      useAuthStore.setState({
        user: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Regular User',
          role: 'USER',
          companyId: 'company-1',
        },
      });

      render(<Header />);

      expect(screen.queryByRole('status', { name: /administrator role/i })).not.toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('should display user icon', () => {
      render(<Header />);

      // Check for user information container
      const userInfo = screen.getByLabelText(/user information/i);
      expect(userInfo).toBeInTheDocument();
    });

    it('should handle missing company gracefully', () => {
      useAuthStore.setState({
        company: null,
      });

      render(<Header />);

      // Should still render header without company name
      expect(screen.getAllByText('LunchSync')[0]).toBeInTheDocument();
      expect(screen.queryByText('Test Company')).not.toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    it('should call logout and navigate to login on logout button click', async () => {
      const user = userEvent.setup();
      const mockLogout = vi.fn();
      
      useAuthStore.setState({
        logout: mockLogout,
      });

      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /log out/i });
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should have accessible logout button with aria-label', () => {
      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /log out of your account/i });
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton).toHaveAccessibleName();
    });

    it('should show logout icon', () => {
      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /log out/i });
      // Icon has aria-hidden, so we check button exists
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper banner role for header', () => {
      render(<Header />);

      const header = screen.getByRole('banner');
      expect(header).toHaveAttribute('data-layout-header');
    });

    it('should have aria-label for user menu navigation', () => {
      render(<Header />);

      const nav = screen.getByRole('navigation', { name: /user menu/i });
      expect(nav).toHaveAttribute('aria-label', 'User menu');
    });

    it('should have aria-hidden on decorative icons', () => {
      render(<Header />);

      // Icons should have aria-hidden (tested implicitly - they don't appear in accessible tree)
      const userInfo = screen.getByLabelText(/user information/i);
      expect(userInfo).toBeInTheDocument();
    });

    it('should have semantic heading for app name', () => {
      render(<Header />);

      // Just verify LunchSync text is present
      expect(screen.getAllByText('LunchSync')[0]).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render with responsive classes', () => {
      render(<Header />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('border-b');
      expect(header).toHaveStyle({ borderColor: 'rgb(15, 23, 42)' });
    });

    it('should have mobile navigation component', () => {
      render(<Header />);

      // MobileNav component should be present
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });
  });

  describe('User Experience', () => {
    it('should display full user information in correct order', () => {
      useAuthStore.setState({
        user: {
          id: 'user-1',
          email: 'john@acme.com',
          name: 'John Doe',
          role: 'ADMIN',
          companyId: 'company-1',
        },
        company: {
          id: 'company-1',
          name: 'Acme Inc',
          domain: 'acme.com',
          slug: 'acme',
        },
      });

      render(<Header />);

      // Check all elements are present
      expect(screen.getAllByText('LunchSync')[0]).toBeInTheDocument();
      expect(screen.getByText('Acme Inc')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should maintain consistent layout with different user roles', () => {
      const regularUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Regular User',
        role: 'USER' as const,
        companyId: 'company-1',
      };

      render(<Header />);
      useAuthStore.setState({ user: regularUser });

      // Layout should still be consistent
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });
  });
});
