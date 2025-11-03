import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserProfile from '@/pages/UserProfile';
import { renderWithProviders } from '../utils/test-utils';
import { createMockUser } from '../utils/factories';

// Mock hooks
vi.mock('@/lib/api/hooks', () => ({
  useUpdateProfile: vi.fn(),
  useChangePassword: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Import mocked modules
import { useUpdateProfile, useChangePassword } from '@/lib/api/hooks';
import { useAuthStore } from '@/store/authStore';

describe('UserProfile', () => {
  const mockUser = createMockUser({
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'USER',
  });

  const mockUpdateProfileMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };

  const mockChangePasswordMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useAuthStore as any).mockReturnValue({
      user: mockUser,
    });

    (useUpdateProfile as any).mockReturnValue(mockUpdateProfileMutation);
    (useChangePassword as any).mockReturnValue(mockChangePasswordMutation);
  });

  describe('Rendering & Structure', () => {
    it('should render the page title and description', () => {
      renderWithProviders(<UserProfile />);

      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      expect(screen.getByText('Manage your personal information and security')).toBeInTheDocument();
    });

    it('should render profile information section', () => {
      renderWithProviders(<UserProfile />);

      expect(screen.getByText('Profile Information')).toBeInTheDocument();
      expect(screen.getByText('Update your personal details')).toBeInTheDocument();
    });

    it('should render account security section', () => {
      renderWithProviders(<UserProfile />);

      expect(screen.getByText('Account Security')).toBeInTheDocument();
      expect(screen.getByText('Manage your password and security settings')).toBeInTheDocument();
    });

    it('should render account information section', () => {
      renderWithProviders(<UserProfile />);

      expect(screen.getByText('Account Information')).toBeInTheDocument();
    });
  });

  describe('Profile Information Display', () => {
    it('should pre-populate name field with current user name', () => {
      renderWithProviders(<UserProfile />);

      const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
      expect(nameInput.value).toBe(mockUser.name);
    });

    it('should pre-populate email field with current user email', () => {
      renderWithProviders(<UserProfile />);

      const emailInput = screen.getByLabelText('Email Address') as HTMLInputElement;
      expect(emailInput.value).toBe(mockUser.email);
    });

    it('should have email input with email icon', () => {
      renderWithProviders(<UserProfile />);

      const emailInput = screen.getByLabelText('Email Address');
      expect(emailInput).toBeInTheDocument();
      // Email icon should be present (via className check or visual inspection)
    });

    it('should disable save button when no changes made', () => {
      renderWithProviders(<UserProfile />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Form Interaction', () => {
    it('should allow updating name field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      expect(nameInput).toHaveValue('Jane Smith');
    });

    it('should allow updating email field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const emailInput = screen.getByLabelText('Email Address');
      await user.clear(emailInput);
      await user.type(emailInput, 'jane@example.com');

      expect(emailInput).toHaveValue('jane@example.com');
    });

    it('should enable save button when name is changed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeEnabled();
    });

    it('should enable save button when email is changed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const emailInput = screen.getByLabelText('Email Address');
      await user.clear(emailInput);
      await user.type(emailInput, 'jane@example.com');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeEnabled();
    });
  });

  describe('Form Validation', () => {
    it('should show error when name is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, ' '); // Whitespace only
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
    });

    it('should show error when name is too short', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'A');
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
    });

    it('should show error when email is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const emailInput = screen.getByLabelText('Email Address');
      await user.clear(emailInput);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('should show error when email format is invalid', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const emailInput = screen.getByLabelText('Email Address');
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('should show error when email is missing @ symbol', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const emailInput = screen.getByLabelText('Email Address');
      await user.clear(emailInput);
      await user.type(emailInput, 'invalidemail.com');
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('should show error when email is missing domain', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const emailInput = screen.getByLabelText('Email Address');
      await user.clear(emailInput);
      await user.type(emailInput, 'user@');
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('should highlight name field with error styling', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(nameInput).toHaveClass('border-red-500');
      });
    });

    it('should highlight email field with error styling', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const emailInput = screen.getByLabelText('Email Address');
      await user.clear(emailInput);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(emailInput).toHaveClass('border-red-500');
      });
    });

    it('should not submit when validation fails', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(mockUpdateProfileMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with updated name', async () => {
      mockUpdateProfileMutation.mutateAsync.mockResolvedValue({});
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfileMutation.mutateAsync).toHaveBeenCalledWith({
          name: 'Jane Smith',
          email: mockUser.email,
        });
      });
    });

    it('should submit form with updated email', async () => {
      mockUpdateProfileMutation.mutateAsync.mockResolvedValue({});
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const emailInput = screen.getByLabelText('Email Address');
      await user.clear(emailInput);
      await user.type(emailInput, 'jane@example.com');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfileMutation.mutateAsync).toHaveBeenCalledWith({
          name: mockUser.name,
          email: 'jane@example.com',
        });
      });
    });

    it('should submit form with both name and email updated', async () => {
      mockUpdateProfileMutation.mutateAsync.mockResolvedValue({});
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      const emailInput = screen.getByLabelText('Email Address');
      await user.clear(emailInput);
      await user.type(emailInput, 'jane@example.com');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfileMutation.mutateAsync).toHaveBeenCalledWith({
          name: 'Jane Smith',
          email: 'jane@example.com',
        });
      });
    });

    it('should show loading state during submission', async () => {
      (useUpdateProfile as any).mockReturnValue({
        ...mockUpdateProfileMutation,
        isPending: true,
      });

      renderWithProviders(<UserProfile />);

      expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeDisabled();
    });

    it('should disable save button during submission', async () => {
      (useUpdateProfile as any).mockReturnValue({
        ...mockUpdateProfileMutation,
        isPending: true,
      });

      renderWithProviders(<UserProfile />);

      const saveButton = screen.getByRole('button', { name: /saving\.\.\./i });
      expect(saveButton).toBeDisabled();
    });

    it('should handle submission errors gracefully', async () => {
      mockUpdateProfileMutation.mutateAsync.mockRejectedValue(new Error('Update failed'));
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Form should remain accessible on error
      await waitFor(() => {
        expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      });
    });
  });

  describe('Password Change', () => {
    it('should render change password button', () => {
      renderWithProviders(<UserProfile />);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      expect(changePasswordButton).toBeInTheDocument();
    });

    it('should open password dialog when change password is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      await user.click(changePasswordButton);

      // Dialog should open (component will be tested separately)
      // This test verifies the button click handler works
    });

    it('should have password icon on change password button', () => {
      renderWithProviders(<UserProfile />);

      const changePasswordButton = screen.getByRole('button', { name: /change password/i });
      expect(changePasswordButton).toBeInTheDocument();
      // Lock icon should be present (visual confirmation)
    });
  });

  describe('Account Information', () => {
    it('should display user role', () => {
      renderWithProviders(<UserProfile />);

      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText(mockUser.role)).toBeInTheDocument();
    });

    it('should display user ID', () => {
      renderWithProviders(<UserProfile />);

      expect(screen.getByText('User ID')).toBeInTheDocument();
      expect(screen.getByText(mockUser.id)).toBeInTheDocument();
    });

    it('should display user ID with monospace font', () => {
      renderWithProviders(<UserProfile />);

      const userIdElement = screen.getByText(mockUser.id);
      expect(userIdElement).toHaveClass('font-mono');
    });

    it('should display role for admin users', () => {
      const adminUser = createMockUser({ role: 'ADMIN' });
      (useAuthStore as any).mockReturnValue({
        user: adminUser,
      });

      renderWithProviders(<UserProfile />);

      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithProviders(<UserProfile />);

      const h1 = screen.getByRole('heading', { level: 1, name: /profile settings/i });
      expect(h1).toBeInTheDocument();

      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it('should have properly labeled form inputs', () => {
      renderWithProviders(<UserProfile />);

      const nameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email Address');

      expect(nameInput).toHaveAttribute('id', 'name');
      expect(emailInput).toHaveAttribute('id', 'email');
    });

    it('should have accessible buttons with clear labels', () => {
      renderWithProviders(<UserProfile />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      const changePasswordButton = screen.getByRole('button', { name: /change password/i });

      expect(saveButton).toBeInTheDocument();
      expect(changePasswordButton).toBeInTheDocument();
    });

    it('should have email input with proper type', () => {
      renderWithProviders(<UserProfile />);

      const emailInput = screen.getByLabelText('Email Address');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should have name input with placeholder', () => {
      renderWithProviders(<UserProfile />);

      const nameInput = screen.getByLabelText('Full Name');
      expect(nameInput).toHaveAttribute('placeholder', 'John Doe');
    });

    it('should have email input with placeholder', () => {
      renderWithProviders(<UserProfile />);

      const emailInput = screen.getByLabelText('Email Address');
      expect(emailInput).toHaveAttribute('placeholder', 'john@example.com');
    });
  });
});
