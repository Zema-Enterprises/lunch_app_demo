import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import {
  useCompany,
  useUpdateCompany,
  useCompanyUsers,
  useCompanyStats,
  useTenantInvites,
  useCreateInvite,
} from '@/lib/api/hooks';
import { Building, Users, Calendar, TrendingUp, MailPlus } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { TenantInvite } from '@/types';

const inviteRoleOptions: { value: TenantInvite['role']; label: string }[] = [
  { value: 'USER', label: 'Team Member' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Administrator' },
];

export default function CompanySettings() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: users, isLoading: usersLoading } = useCompanyUsers();
  const { data: stats, isLoading: statsLoading } = useCompanyStats();
  const updateCompanyMutation = useUpdateCompany();
  const { addToast } = useNotificationStore();
  const { data: invites, isLoading: invitesLoading } = useTenantInvites({ enabled: isAdmin });
  const createInviteMutation = useCreateInvite();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'USER',
    note: '',
  });
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        domain: company.domain,
      });
    }
  }, [company]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.domain || formData.domain.trim().length < 2) {
      newErrors.domain = 'Domain must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateInviteForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!inviteForm.email || !inviteForm.email.includes('@')) {
      newErrors.email = 'Enter a valid email address';
    }

    setInviteErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInviteCopy = async (link: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        addToast({ type: 'success', message: 'Invite link copied to clipboard' });
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      addToast({ type: 'info', message: 'Copy failed. Use the link below instead.' });
    }
  };

  const handleInviteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateInviteForm()) {
      return;
    }

    try {
      const result = await createInviteMutation.mutateAsync(inviteForm);
      const inviteLink = new URL(`/invite/${result.token}`, window.location.origin).toString();
      setLastInviteLink(inviteLink);
      await handleInviteCopy(inviteLink);
      setInviteForm({
        email: '',
        role: 'USER',
        note: '',
      });
      setInviteErrors({});
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Failed to send invite. Please try again.';
      setInviteErrors({ form: message });
    }
  };

  const getStatusVariant = (status: TenantInvite['status']) => {
    switch (status) {
      case 'PENDING':
        return 'secondary';
      case 'REDEEMED':
        return 'success';
      case 'REVOKED':
        return 'destructive';
      case 'EXPIRED':
      default:
        return 'outline';
    }
  };

  const describeInviteTimeline = (invite: TenantInvite) => {
    if (invite.status === 'PENDING') {
      return `Expires ${formatDistanceToNow(new Date(invite.expiresAt), {
        addSuffix: true,
      })}`;
    }

    if (invite.status === 'REDEEMED' && invite.redeemedAt) {
      return `Redeemed ${formatDistanceToNow(new Date(invite.redeemedAt), {
        addSuffix: true,
      })}`;
    }

    if (invite.status === 'REVOKED' && invite.revokedAt) {
      return `Revoked ${formatDistanceToNow(new Date(invite.revokedAt), {
        addSuffix: true,
      })}`;
    }

    return invite.status === 'EXPIRED' ? 'Expired' : 'Updated';
  };

  const inviteRoleLabel = (role: TenantInvite['role']) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'MANAGER':
        return 'Manager';
      default:
        return 'Member';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await updateCompanyMutation.mutateAsync(formData);
      setIsEditing(false);
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleCancel = () => {
    setFormData({
      name: company?.name || '',
      domain: company?.domain || '',
    });
    setErrors({});
    setIsEditing(false);
  };

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading company settings...</div>
      </div>
    );
  }

  const hasChanges = formData.name !== company?.name || formData.domain !== company?.domain;
  const invitesToRender = invites ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Settings</h1>
        <p className="text-gray-600 mt-1">
          {isAdmin ? 'Manage your company information and settings' : 'View your company information'}
        </p>
      </div>

      {/* Company Information */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Company Information</h2>
              <p className="text-sm text-gray-600">Your organization details</p>
            </div>
          </div>
          {isAdmin && !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="text-sm font-medium block mb-1">
                Company Name
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corporation"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="domain" className="text-sm font-medium block mb-1">
                Domain
              </label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="acme.com"
                className={errors.domain ? 'border-red-500' : ''}
              />
              {errors.domain && (
                <p className="text-sm text-red-500 mt-1">{errors.domain}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={updateCompanyMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!hasChanges || updateCompanyMutation.isPending}
              >
                {updateCompanyMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Company Name</span>
              <span className="font-medium">{company?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Domain</span>
              <span className="font-medium">{company?.domain}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Slug</span>
              <span className="font-mono text-sm">{company?.slug}</span>
            </div>
            {company?.createdAt && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Created</span>
                <span className="text-sm">{format(new Date(company.createdAt), 'MMMM d, yyyy')}</span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Company Statistics - Admin Only */}
      {isAdmin && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Company Statistics</h2>
              <p className="text-sm text-gray-600">Overview of company activity</p>
            </div>
          </div>

          {statsLoading ? (
            <div className="text-gray-500 text-center py-8">Loading statistics...</div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total Users</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Total Events</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{stats.totalEvents}</p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Total Restaurants</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">{stats.totalRestaurants}</p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">Total Orders</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">{stats.totalOrders}</p>
              </div>
            </div>
          ) : null}
        </Card>
      )}

      {/* Invitations */}
      {isAdmin && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <MailPlus className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Team Invitations</h2>
              <p className="text-sm text-gray-600">
                Invite teammates to join your company. Invites expire after seven days.
              </p>
            </div>
          </div>

          <form className="grid gap-4 md:grid-cols-[2fr,1fr] md:gap-6" onSubmit={handleInviteSubmit} noValidate>
            <div>
              <label htmlFor="invite-email" className="text-sm font-medium block mb-1">
                Email
              </label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className={inviteErrors.email ? 'border-red-500' : ''}
              />
              {inviteErrors.email && (
                <p className="text-sm text-red-500 mt-1">{inviteErrors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="invite-role" className="text-sm font-medium block mb-1">
                Role
              </label>
              <Select
                id="invite-role"
                value={inviteForm.role}
                onChange={(e) =>
                  setInviteForm({
                    ...inviteForm,
                    role: e.target.value as TenantInvite['role'],
                  })
                }
              >
                {inviteRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="invite-note" className="text-sm font-medium block mb-1">
                Message (optional)
              </label>
              <Input
                id="invite-note"
                placeholder="Add a note for your teammate"
                value={inviteForm.note}
                onChange={(e) => setInviteForm({ ...inviteForm, note: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={createInviteMutation.isPending}>
                {createInviteMutation.isPending ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
          </form>
          {inviteErrors.form && (
            <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
              {inviteErrors.form}
            </div>
          )}
          {lastInviteLink && (
            <div className="mt-4 rounded-md border border-dashed border-gray-300 p-4 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">Latest invite link:</p>
              <code className="block text-sm break-all text-gray-900 mt-1">{lastInviteLink}</code>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => handleInviteCopy(lastInviteLink)}
              >
                Copy link again
              </Button>
            </div>
          )}

          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Recent invites</h3>
              <span className="text-sm text-gray-500">
                Showing {invitesToRender.length} invitation{invitesToRender.length === 1 ? '' : 's'}
              </span>
            </div>
            {invitesLoading ? (
              <div className="text-center text-gray-500 py-6">Loading invitations...</div>
            ) : invitesToRender.length > 0 ? (
              <div className="space-y-3">
                {invitesToRender.map((invite) => (
                  <div key={invite.id} className="border rounded-lg p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{invite.email}</p>
                        <p className="text-sm text-gray-500">{inviteRoleLabel(invite.role)}</p>
                      </div>
                      <Badge variant={getStatusVariant(invite.status)}>{invite.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between text-sm text-gray-600 gap-2">
                      <span>{describeInviteTimeline(invite)}</span>
                      {invite.note && (
                        <span className="italic text-gray-500 truncate max-w-lg">
                          “{invite.note}”
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-6">
                No invites yet. Use the form above to invite your first teammate.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Company Users - Admin Only */}
      {isAdmin && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Company Users</h2>
              <p className="text-sm text-gray-600">All users in your organization</p>
            </div>
          </div>

          {usersLoading ? (
            <div className="text-gray-500 text-center py-8">Loading users...</div>
          ) : users && users.length > 0 ? (
            <div className="space-y-2">
              {users.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-gray-600">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {u.role}
                    </Badge>
                    {u.createdAt && (
                      <span className="text-xs text-gray-500">
                        Joined {format(new Date(u.createdAt), 'MMMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No users found
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
