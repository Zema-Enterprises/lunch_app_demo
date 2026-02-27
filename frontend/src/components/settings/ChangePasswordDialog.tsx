import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChangePassword } from '@/lib/api/hooks';
import { X } from 'lucide-react';
import {
  PASSWORD_COMPLEXITY_REGEX,
  PASSWORD_REQUIREMENTS_MESSAGE,
  PASSWORD_REQUIREMENTS_HINT,
} from '@/lib/validation/schemas';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordDialog({ isOpen, onClose }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const changePasswordMutation = useChangePassword();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (!PASSWORD_COMPLEXITY_REGEX.test(newPassword)) {
      newErrors.newPassword = PASSWORD_REQUIREMENTS_MESSAGE;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });

      // Reset form and close dialog on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      onClose();
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={handleClose}
      />
      <div className="relative z-50 w-full max-w-md mx-4 bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Change Password</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="rounded-sm opacity-70 hover:opacity-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="text-sm font-medium block mb-1">
              Current Password
            </label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className={errors.currentPassword ? 'border-red-500' : ''}
            />
            {errors.currentPassword && (
              <p className="text-sm text-red-500 mt-1">{errors.currentPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="newPassword" className="text-sm font-medium block mb-1">
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className={errors.newPassword ? 'border-red-500' : ''}
            />
            {errors.newPassword ? (
              <p className="text-sm text-red-500 mt-1">{errors.newPassword}</p>
            ) : (
              <p className="text-sm text-gray-500 mt-1">{PASSWORD_REQUIREMENTS_HINT}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium block mb-1">
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className={errors.confirmPassword ? 'border-red-500' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={changePasswordMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
