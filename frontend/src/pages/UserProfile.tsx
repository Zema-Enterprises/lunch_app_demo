import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { useUpdateProfile } from '@/lib/api/hooks';
import { Lock, User as UserIcon, Mail } from 'lucide-react';
import ChangePasswordDialog from '@/components/settings/ChangePasswordDialog';

export default function UserProfile() {
  const { user } = useAuthStore();
  const updateProfileMutation = useUpdateProfile();
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
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
      await updateProfileMutation.mutateAsync(formData);
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const hasChanges = formData.name !== user?.name || formData.email !== user?.email;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="text-gray-600 mt-1">Manage your personal information and security</p>
      </div>

      {/* Profile Information */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <UserIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Profile Information</h2>
            <p className="text-sm text-gray-600">Update your personal details</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="text-sm font-medium block mb-1">
              Full Name
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={!hasChanges || updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Account Security */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <Lock className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Account Security</h2>
            <p className="text-sm text-gray-600">Manage your password and security settings</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Password</p>
            <p className="text-sm text-gray-600">Change your account password</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsPasswordDialogOpen(true)}
          >
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </Button>
        </div>
      </Card>

      {/* Account Information */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Account Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Role</span>
            <span className="font-medium">{user?.role}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">User ID</span>
            <span className="font-mono text-sm">{user?.id}</span>
          </div>
        </div>
      </Card>

      <ChangePasswordDialog
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
      />
    </div>
  );
}
