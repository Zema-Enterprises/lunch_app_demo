import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChangePasswordDialog from '@/components/settings/ChangePasswordDialog';
import { renderWithProviders } from '../../utils/test-utils';
import { PASSWORD_REQUIREMENTS_MESSAGE, PASSWORD_REQUIREMENTS_HINT } from '@/lib/validation/schemas';

// Mock hooks
vi.mock('@/lib/api/hooks', () => ({
  useChangePassword: vi.fn(),
}));

// Import mocked modules
import { useChangePassword } from '@/lib/api/hooks';

describe('ChangePasswordDialog', () => {
  const mockOnClose = vi.fn();
  const mockChangePasswordMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useChangePassword as any).mockReturnValue(mockChangePasswordMutation);
  });
  const STRONG_PASSWORD = 'StrongPass123!';
  const CURRENT_PASSWORD = 'CurrentPass123!';

  describe('Rendering & Structure', () => {
    it('should not render when isOpen is false', () => {
      renderWithProviders(<ChangePasswordDialog isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText('Change Password')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    });

    it('should render close button', () => {
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: '' }); // X button
      expect(closeButton).toBeInTheDocument();
    });

    it('should render cancel and change password buttons', () => {
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should allow entering current password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const currentPasswordInput = screen.getByLabelText('Current Password');
      await user.type(currentPasswordInput, CURRENT_PASSWORD);

      expect(currentPasswordInput).toHaveValue(CURRENT_PASSWORD);
    });

    it('should allow entering new password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const newPasswordInput = screen.getByLabelText('New Password');
      await user.type(newPasswordInput, STRONG_PASSWORD);

      expect(newPasswordInput).toHaveValue(STRONG_PASSWORD);
    });

    it('should allow entering confirm password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
      await user.type(confirmPasswordInput, STRONG_PASSWORD);

      expect(confirmPasswordInput).toHaveValue(STRONG_PASSWORD);
    });

    it('should have password type inputs', () => {
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByLabelText('Current Password')).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText('New Password')).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText('Confirm New Password')).toHaveAttribute('type', 'password');
    });

    it('should have proper autocomplete attributes', () => {
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByLabelText('Current Password')).toHaveAttribute('autoComplete', 'current-password');
      expect(screen.getByLabelText('New Password')).toHaveAttribute('autoComplete', 'new-password');
      expect(screen.getByLabelText('Confirm New Password')).toHaveAttribute('autoComplete', 'new-password');
    });
  });

  describe('Form Validation', () => {
    it('should show error when current password is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('New Password'), STRONG_PASSWORD);
      await user.type(screen.getByLabelText('Confirm New Password'), STRONG_PASSWORD);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      expect(await screen.findByText('Current password is required')).toBeInTheDocument();
    });

    it('should show error when new password is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);
      await user.type(screen.getByLabelText('Confirm New Password'), STRONG_PASSWORD);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      expect(await screen.findByText('New password is required')).toBeInTheDocument();
    });

    it('should show error when new password is too short', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);
      await user.type(screen.getByLabelText('New Password'), 'short');
      await user.type(screen.getByLabelText('Confirm New Password'), 'short');

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      expect(await screen.findByText(PASSWORD_REQUIREMENTS_MESSAGE)).toBeInTheDocument();
    });

    it('should show error when confirm password is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);
      await user.type(screen.getByLabelText('New Password'), STRONG_PASSWORD);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      expect(await screen.findByText('Please confirm your new password')).toBeInTheDocument();
    });

    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);
      await user.type(screen.getByLabelText('New Password'), STRONG_PASSWORD);
      await user.type(screen.getByLabelText('Confirm New Password'), 'differentPassword');

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    });

    it('should highlight current password field with error styling', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Current Password')).toHaveClass('border-red-500');
      });
    });

    it('should highlight new password field with error styling', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toHaveClass('border-red-500');
      });
    });

    it('should highlight confirm password field with error styling', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);
      await user.type(screen.getByLabelText('New Password'), STRONG_PASSWORD);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Confirm New Password')).toHaveClass('border-red-500');
      });
    });

    it('should show password requirement hint under new password field', () => {
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(PASSWORD_REQUIREMENTS_HINT)).toBeInTheDocument();
    });

    it('should replace hint with error when new password validation fails', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);
      await user.type(screen.getByLabelText('New Password'), 'short');

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(PASSWORD_REQUIREMENTS_HINT)).not.toBeInTheDocument();
        expect(screen.getByText(PASSWORD_REQUIREMENTS_MESSAGE)).toBeInTheDocument();
      });
    });

    it('should not submit when validation fails', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      expect(mockChangePasswordMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with correct data', async () => {
      mockChangePasswordMutation.mutateAsync.mockResolvedValue({});
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);
      await user.type(screen.getByLabelText('New Password'), STRONG_PASSWORD);
      await user.type(screen.getByLabelText('Confirm New Password'), STRONG_PASSWORD);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockChangePasswordMutation.mutateAsync).toHaveBeenCalledWith({
          currentPassword: CURRENT_PASSWORD,
          newPassword: STRONG_PASSWORD,
        });
      });
    });

    it('should close dialog on successful submission', async () => {
      mockChangePasswordMutation.mutateAsync.mockResolvedValue({});
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);
      await user.type(screen.getByLabelText('New Password'), STRONG_PASSWORD);
      await user.type(screen.getByLabelText('Confirm New Password'), STRONG_PASSWORD);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should reset form on successful submission', async () => {
      mockChangePasswordMutation.mutateAsync.mockResolvedValue({});
      const user = userEvent.setup();
      const { rerender } = renderWithProviders(
        <ChangePasswordDialog isOpen={true} onClose={mockOnClose} />
      );

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);
      await user.type(screen.getByLabelText('New Password'), STRONG_PASSWORD);
      await user.type(screen.getByLabelText('Confirm New Password'), STRONG_PASSWORD);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });

      // Reopen dialog
      mockOnClose.mockClear();
      rerender(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      // Fields should be empty
      expect(screen.getByLabelText('Current Password')).toHaveValue('');
      expect(screen.getByLabelText('New Password')).toHaveValue('');
      expect(screen.getByLabelText('Confirm New Password')).toHaveValue('');
    });

    it('should show loading state during submission', async () => {
      (useChangePassword as any).mockReturnValue({
        ...mockChangePasswordMutation,
        isPending: true,
      });

      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /changing\.\.\./i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /changing\.\.\./i })).toBeDisabled();
    });

    it('should disable both buttons during submission', async () => {
      (useChangePassword as any).mockReturnValue({
        ...mockChangePasswordMutation,
        isPending: true,
      });

      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /changing\.\.\./i })).toBeDisabled();
    });

    it('should handle submission errors gracefully', async () => {
      mockChangePasswordMutation.mutateAsync.mockRejectedValue(new Error('Password change failed'));
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);
      await user.type(screen.getByLabelText('New Password'), STRONG_PASSWORD);
      await user.type(screen.getByLabelText('Confirm New Password'), STRONG_PASSWORD);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      // Dialog should remain open on error
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
      });
    });

    it('should not close dialog on submission error', async () => {
      mockChangePasswordMutation.mutateAsync.mockRejectedValue(new Error('Password change failed'));
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);
      await user.type(screen.getByLabelText('New Password'), STRONG_PASSWORD);
      await user.type(screen.getByLabelText('Confirm New Password'), STRONG_PASSWORD);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockChangePasswordMutation.mutateAsync).toHaveBeenCalled();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Dialog Actions', () => {
    it('should close dialog when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close dialog when X button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: '' }); // X button with no text
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close dialog when backdrop is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      // Find backdrop (first div with bg-black/50)
      const backdrop = document.querySelector('.bg-black\\/50');
      if (backdrop) {
        await user.click(backdrop as Element);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should reset form when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText('Current Password'), CURRENT_PASSWORD);
      await user.type(screen.getByLabelText('New Password'), STRONG_PASSWORD);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should clear errors when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      // Should have errors
      expect(await screen.findByText('Current password is required')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should clear errors when X button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      await user.click(submitButton);

      // Should have errors
      expect(await screen.findByText('Current password is required')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: '' });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading for dialog title', () => {
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const heading = screen.getByRole('heading', { name: /change password/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have properly labeled form inputs', () => {
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const currentPasswordInput = screen.getByLabelText('Current Password');
      const newPasswordInput = screen.getByLabelText('New Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

      expect(currentPasswordInput).toHaveAttribute('id', 'currentPassword');
      expect(newPasswordInput).toHaveAttribute('id', 'newPassword');
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirmPassword');
    });

    it('should have accessible buttons with clear labels', () => {
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const submitButton = screen.getByRole('button', { name: /change password/i });

      expect(cancelButton).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });

    it('should have form element with proper structure', () => {
      renderWithProviders(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

      const form = screen.getByLabelText('Current Password').closest('form');
      expect(form).toBeInTheDocument();
    });
  });
});
