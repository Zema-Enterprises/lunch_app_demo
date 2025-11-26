import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompanySettings from '@/pages/CompanySettings';
import { renderWithProviders } from '../utils/test-utils';
import { createMockUser, createMockCompany, createMockInvite, createMockTheme } from '../utils/factories';

// Mock hooks
vi.mock('@/lib/api/hooks', () => ({
  useCompany: vi.fn(),
  useUpdateCompany: vi.fn(),
  useCompanyUsers: vi.fn(),
  useCompanyStats: vi.fn(),
  useTenantInvites: vi.fn(),
  useCreateInvite: vi.fn(),
  useCompanyTheme: vi.fn(),
  useUpdateCompanyTheme: vi.fn(),
  useUploadThemeCover: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/store/notificationStore', () => ({
  useNotificationStore: vi.fn(),
}));

// Import mocked modules
import { useCompany, useUpdateCompany, useCompanyUsers, useCompanyStats, useTenantInvites, useCreateInvite, useCompanyTheme, useUpdateCompanyTheme, useUploadThemeCover } from '@/lib/api/hooks';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

const mockClipboard = {
  writeText: vi.fn(),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

describe('CompanySettings', () => {
  const mockAdmin = createMockUser({ role: 'ADMIN' });
  const mockUser = createMockUser({ role: 'USER' });
  const mockCompany = createMockCompany();
  const mockUsers = [
    createMockUser({ id: '1', name: 'Admin User', email: 'admin@test.com', role: 'ADMIN' }),
    createMockUser({ id: '2', name: 'Regular User', email: 'user@test.com', role: 'USER' }),
  ];
  const mockStats = {
    totalUsers: 15,
    totalEvents: 42,
    totalRestaurants: 8,
    totalOrders: 256,
  };

  const mockUpdateCompanyMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };
  const mockCreateInviteMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  };
  const mockUpdateThemeMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  };
  const mockUploadCoverMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  };
  const mockAddToast = vi.fn();
  const mockTheme = createMockTheme();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddToast.mockReset();
    mockCreateInviteMutation.mutateAsync.mockReset();
    mockClipboard.writeText.mockReset();
    mockClipboard.writeText.mockResolvedValue(undefined);
    
    (useAuthStore as any).mockReturnValue({
      user: mockAdmin,
    });

    (useCompany as any).mockReturnValue({
      data: mockCompany,
      isLoading: false,
      isError: false,
    });

    (useUpdateCompany as any).mockReturnValue(mockUpdateCompanyMutation);

    (useCompanyUsers as any).mockReturnValue({
      data: mockUsers,
      isLoading: false,
      isError: false,
    });

    (useCompanyStats as any).mockReturnValue({
      data: mockStats,
      isLoading: false,
      isError: false,
    });

    (useTenantInvites as any).mockReturnValue({
      data: [],
      isLoading: false,
    });

    (useCreateInvite as any).mockReturnValue(mockCreateInviteMutation);

    (useNotificationStore as any).mockReturnValue({
      addToast: mockAddToast,
    });

    (useCompanyTheme as any).mockReturnValue({
      data: mockTheme,
      isLoading: false,
    });
    (useUpdateCompanyTheme as any).mockReturnValue(mockUpdateThemeMutation);
    (useUploadThemeCover as any).mockReturnValue(mockUploadCoverMutation);
  });

  describe('Rendering & Structure', () => {
    it('should render the page title and description', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Company Settings')).toBeInTheDocument();
      expect(screen.getByText('Manage your company information and settings')).toBeInTheDocument();
    });

    it('should render company information section', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Company Information')).toBeInTheDocument();
    });

    it('should render company statistics section for admin', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Company Statistics')).toBeInTheDocument();
    });

    it('should render company users section for admin', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Company Users')).toBeInTheDocument();
    });

    it('should show loading state while fetching company data', () => {
      (useCompany as any).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Loading company settings...')).toBeInTheDocument();
    });
  });

  describe('Company Information Display', () => {
    it('should display company name in view mode', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Company Name')).toBeInTheDocument();
      expect(screen.getByText(mockCompany.name)).toBeInTheDocument();
    });

    it('should display company domain in view mode', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Domain')).toBeInTheDocument();
      expect(screen.getByText(mockCompany.domain)).toBeInTheDocument();
    });

    it('should display company slug in view mode', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Slug')).toBeInTheDocument();
      expect(screen.getByText(mockCompany.slug)).toBeInTheDocument();
    });

    it('should display company creation date in view mode', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Created')).toBeInTheDocument();
      // Date format: "MMMM d, yyyy" (e.g., "October 7, 2025")
      const createdLabel = screen.getByText('Created');
      const dateText = createdLabel.closest('.flex')?.querySelector('.text-sm');
      expect(dateText).toBeTruthy();
      expect(dateText?.textContent).toMatch(/\w+ \d{1,2}, \d{4}/);
    });

    it('should show edit button for admin in view mode', () => {
      renderWithProviders(<CompanySettings />);

      const editButton = screen.getByRole('button', { name: /^edit$/i });
      expect(editButton).toBeInTheDocument();
      expect(editButton).toBeEnabled();
    });
  });

  describe('Invitations', () => {
    it('should render invitations section for admins', () => {
      (useTenantInvites as any).mockReturnValue({
        data: [createMockInvite({ email: 'pending@test.com' })],
        isLoading: false,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Team Invitations')).toBeInTheDocument();
      expect(screen.getByText('pending@test.com')).toBeInTheDocument();
    });

    it('should submit invite form', async () => {
      const user = userEvent.setup();
      const mutateSpy = vi.fn().mockResolvedValue({
        token: 'invite-token',
        invite: createMockInvite(),
      });
      (useCreateInvite as any).mockReturnValue({
        mutateAsync: mutateSpy,
        isPending: false,
      });

      renderWithProviders(<CompanySettings />);

      await user.type(screen.getByPlaceholderText('teammate@example.com'), 'invitee@example.com');
      await user.click(screen.getByRole('button', { name: /send invite/i }));

      expect(mutateSpy).toHaveBeenCalledWith({
        email: 'invitee@example.com',
        role: 'USER',
        note: '',
      });
    });

    it('should hide invitations section for non-admins', () => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.queryByText('Team Invitations')).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should enter edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      const editButton = screen.getByRole('button', { name: /^edit$/i });
      await user.click(editButton);

      // Should show form inputs
      expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Domain')).toBeInTheDocument();
      
      // Should show save and cancel buttons
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      
      // Should not show edit button
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    });

    it('should pre-populate form fields with current company data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));

      const nameInput = screen.getByLabelText('Company Name') as HTMLInputElement;
      const domainInput = screen.getByLabelText('Domain') as HTMLInputElement;

      expect(nameInput.value).toBe(mockCompany.name);
      expect(domainInput.value).toBe(mockCompany.domain);
    });

    it('should allow updating company name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));

      const nameInput = screen.getByLabelText('Company Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Company Name');

      expect(nameInput).toHaveValue('New Company Name');
    });

    it('should allow updating company domain', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));

      const domainInput = screen.getByLabelText('Domain');
      await user.clear(domainInput);
      await user.type(domainInput, 'newcompany.com');

      expect(domainInput).toHaveValue('newcompany.com');
    });

    it('should exit edit mode when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Should return to view mode
      expect(screen.queryByLabelText('Company Name')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    });

    it('should reset form data when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      
      const nameInput = screen.getByLabelText('Company Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Changed Name');

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      // Re-enter edit mode
      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      
      // Should be reset to original value
      expect(screen.getByLabelText('Company Name')).toHaveValue(mockCompany.name);
    });

    it('should clear errors when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      
      // Create validation error
      const nameInput = screen.getByLabelText('Company Name');
      await user.clear(nameInput);
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      // Re-enter edit mode
      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      
      // Error should be cleared
      expect(screen.queryByText('Name must be at least 2 characters')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when name is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      
      const nameInput = screen.getByLabelText('Company Name');
      await user.clear(nameInput);
      
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
    });

    it('should show error when name is too short', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      
      const nameInput = screen.getByLabelText('Company Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'A');
      
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
    });

    it('should show error when domain is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      
      const domainInput = screen.getByLabelText('Domain');
      await user.clear(domainInput);
      
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(await screen.findByText('Domain must be at least 2 characters')).toBeInTheDocument();
    });

    it('should show error when domain is too short', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      
      const domainInput = screen.getByLabelText('Domain');
      await user.clear(domainInput);
      await user.type(domainInput, 'x');
      
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(await screen.findByText('Domain must be at least 2 characters')).toBeInTheDocument();
    });

    it('should not submit when validation fails', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      
      const nameInput = screen.getByLabelText('Company Name');
      await user.clear(nameInput);
      
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(mockUpdateCompanyMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with updated data', async () => {
      mockUpdateCompanyMutation.mutateAsync.mockResolvedValue({});
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      
      const nameInput = screen.getByLabelText('Company Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Company');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockUpdateCompanyMutation.mutateAsync).toHaveBeenCalledWith({
          name: 'Updated Company',
          domain: mockCompany.domain,
        });
      });
    });

    it('should show loading state during submission', async () => {
      (useUpdateCompany as any).mockReturnValue({
        ...mockUpdateCompanyMutation,
        isPending: true,
      });

      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));

      expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeDisabled();
    });

    it('should disable cancel button during submission', async () => {
      (useUpdateCompany as any).mockReturnValue({
        ...mockUpdateCompanyMutation,
        isPending: true,
      });

      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('should handle submission errors', async () => {
      const errorMessage = 'Failed to update company';
      mockUpdateCompanyMutation.mutateAsync.mockRejectedValue(new Error(errorMessage));

      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      
      const nameInput = screen.getByLabelText('Company Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Company');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      // Should remain in edit mode on error
      await waitFor(() => {
        expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
      });
    });

    it('should only submit if form data changed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));
      
      // Don't change anything, just try to save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      
      // Save button should be disabled if no changes
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Company Statistics', () => {
    it('should display total users statistic', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText(mockStats.totalUsers.toString())).toBeInTheDocument();
    });

    it('should display total events statistic', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Total Events')).toBeInTheDocument();
      expect(screen.getByText(mockStats.totalEvents.toString())).toBeInTheDocument();
    });

    it('should display total restaurants statistic', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Total Restaurants')).toBeInTheDocument();
      expect(screen.getByText(mockStats.totalRestaurants.toString())).toBeInTheDocument();
    });

    it('should display total orders statistic', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText(mockStats.totalOrders.toString())).toBeInTheDocument();
    });

    it('should show loading state while fetching statistics', () => {
      (useCompanyStats as any).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
    });

    it('should not show statistics section for non-admin users', () => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.queryByText('Company Statistics')).not.toBeInTheDocument();
    });
  });

  describe('Company Users List', () => {
    it('should display all users in the list', () => {
      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('admin@test.com')).toBeInTheDocument();
      expect(screen.getByText('Regular User')).toBeInTheDocument();
      expect(screen.getByText('user@test.com')).toBeInTheDocument();
    });

    it('should display user role badges correctly', () => {
      renderWithProviders(<CompanySettings />);

      const roleBadges = screen.getAllByText(/ADMIN|USER/);
      expect(roleBadges).toHaveLength(2);
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
      expect(screen.getByText('USER')).toBeInTheDocument();
    });

    it('should display user join dates', () => {
      renderWithProviders(<CompanySettings />);

      // Should show formatted dates (MMM d, yyyy)
      const dateElements = screen.getAllByText(/\w+ \d{1,2}, \d{4}/);
      expect(dateElements.length).toBeGreaterThanOrEqual(2); // At least 2 users
    });

    it('should show loading state while fetching users', () => {
      (useCompanyUsers as any).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Loading users...')).toBeInTheDocument();
    });

    it('should show empty state when no users found', () => {
      (useCompanyUsers as any).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    it('should not show users section for non-admin users', () => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.queryByText('Company Users')).not.toBeInTheDocument();
    });
  });

  describe('RBAC - Admin vs User Permissions', () => {
    it('should show all sections for admin users', () => {
      (useAuthStore as any).mockReturnValue({
        user: mockAdmin,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Company Information')).toBeInTheDocument();
      expect(screen.getByText('Company Statistics')).toBeInTheDocument();
      expect(screen.getByText('Company Users')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    });

    it('should only show company information for regular users', () => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Company Information')).toBeInTheDocument();
      expect(screen.queryByText('Company Statistics')).not.toBeInTheDocument();
      expect(screen.queryByText('Company Users')).not.toBeInTheDocument();
    });

    it('should not show edit button for regular users', () => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    });

    it('should show company name in read-only mode for regular users', () => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Company Name')).toBeInTheDocument();
      expect(screen.getByText(mockCompany.name)).toBeInTheDocument();
      expect(screen.queryByLabelText('Company Name')).not.toBeInTheDocument();
    });

    it('should show company domain in read-only mode for regular users', () => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Domain')).toBeInTheDocument();
      expect(screen.getByText(mockCompany.domain)).toBeInTheDocument();
      expect(screen.queryByLabelText('Domain')).not.toBeInTheDocument();
    });

    it('should show company slug for all users', () => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Slug')).toBeInTheDocument();
      expect(screen.getByText(mockCompany.slug)).toBeInTheDocument();
    });

    it('should show company creation date for all users', () => {
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
      });

      renderWithProviders(<CompanySettings />);

      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText(/\w+ \d{1,2}, \d{4}/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithProviders(<CompanySettings />);

      const h1 = screen.getByRole('heading', { level: 1, name: /company settings/i });
      expect(h1).toBeInTheDocument();

      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it('should have properly labeled form inputs', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));

      const nameInput = screen.getByLabelText('Company Name');
      const domainInput = screen.getByLabelText('Domain');

      expect(nameInput).toHaveAttribute('id');
      expect(domainInput).toHaveAttribute('id');
    });

    it('should have accessible buttons with clear labels', () => {
      renderWithProviders(<CompanySettings />);

      const editButton = screen.getByRole('button', { name: /^edit$/i });
      expect(editButton).toBeInTheDocument();
    });

    it('should have accessible form elements in edit mode', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CompanySettings />);

      await user.click(screen.getByRole('button', { name: /^edit$/i }));

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(saveButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });
  });
});
