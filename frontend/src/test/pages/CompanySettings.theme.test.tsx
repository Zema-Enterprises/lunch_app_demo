import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import CompanySettings from '@/pages/CompanySettings';
import { renderWithProviders } from '../utils/test-utils';
import { createMockCompany, createMockTheme, createMockUser } from '../utils/factories';

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
  useNotificationStore: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

const {
  useCompany,
  useUpdateCompany,
  useCompanyUsers,
  useCompanyStats,
  useTenantInvites,
  useCreateInvite,
  useCompanyTheme,
  useUpdateCompanyTheme,
  useUploadThemeCover,
} = await import('@/lib/api/hooks');
const { useAuthStore } = await import('@/store/authStore');

const baseCompany = createMockCompany();
const baseUser = createMockUser({ role: 'ADMIN' });
const baseTheme = createMockTheme();

describe('CompanySettings - Theme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as vi.Mock).mockReturnValue({ user: baseUser });

    (useCompany as unknown as vi.Mock).mockReturnValue({
      data: baseCompany,
      isLoading: false,
      isError: false,
    });
    (useUpdateCompany as unknown as vi.Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    (useCompanyUsers as unknown as vi.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    (useCompanyStats as unknown as vi.Mock).mockReturnValue({
      data: {
        totalUsers: 0,
        totalEvents: 0,
        totalRestaurants: 0,
        totalOrders: 0,
      },
      isLoading: false,
      isError: false,
    });
    (useTenantInvites as unknown as vi.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
    (useCreateInvite as unknown as vi.Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (useCompanyTheme as unknown as vi.Mock).mockReturnValue({
      data: baseTheme,
      isLoading: false,
    });

    (useUpdateCompanyTheme as unknown as vi.Mock).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(baseTheme),
      isPending: false,
    });

    (useUploadThemeCover as unknown as vi.Mock).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(baseTheme),
      isPending: false,
    });
  });

  it('shows current theme values and cover metadata', () => {
    renderWithProviders(<CompanySettings />);

    expect(screen.getByText('Branding & Theme')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary color')).toHaveValue(baseTheme.primaryColor.toLowerCase());
    expect(screen.getByLabelText('Secondary color')).toHaveValue(baseTheme.secondaryColor.toLowerCase());
    expect(screen.getByLabelText(/Header fill color/i)).toHaveValue(baseTheme.backgroundColor.toLowerCase());
    expect(screen.getByTestId('theme-preview')).toBeInTheDocument();
    expect(screen.getByText(/Cover photo set/)).toBeInTheDocument();
  });

  it('submits updated theme colors', async () => {
    const updateThemeMock = {
      mutateAsync: vi.fn().mockResolvedValue(baseTheme),
      isPending: false,
    };
    (useUpdateCompanyTheme as unknown as vi.Mock).mockReturnValue(updateThemeMock);

    renderWithProviders(<CompanySettings />);

    fireEvent.change(screen.getByLabelText('Primary color'), { target: { value: '#654321' } });
    fireEvent.change(screen.getByLabelText('Secondary color'), { target: { value: '#ff6600' } });
    fireEvent.change(screen.getByLabelText(/Header fill color/i), { target: { value: '#ffffff' } });

    await userEvent.click(screen.getByRole('button', { name: /save theme/i }));

    await waitFor(() => {
      expect(updateThemeMock.mutateAsync).toHaveBeenCalledWith({
        primaryColor: '#654321',
        secondaryColor: '#ff6600',
        backgroundColor: '#ffffff',
        useCover: false,
      });
    });
  });

  it('disables cover when changing header fill color', async () => {
    const updateThemeMock = {
      mutateAsync: vi.fn().mockResolvedValue({ ...baseTheme, coverPhotoUrl: null, coverPhotoMeta: null }),
      isPending: false,
    };
    (useUpdateCompanyTheme as unknown as vi.Mock).mockReturnValue(updateThemeMock);

    renderWithProviders(<CompanySettings />);

    fireEvent.change(screen.getByLabelText(/Header fill color/i), { target: { value: '#111111' } });
    await userEvent.click(screen.getByRole('button', { name: /save theme/i }));

    await waitFor(() => {
      expect(updateThemeMock.mutateAsync).toHaveBeenCalledWith({
        primaryColor: baseTheme.primaryColor,
        secondaryColor: baseTheme.secondaryColor,
        backgroundColor: '#111111',
        useCover: false,
      });
    });
  });

  it('keeps cover active when only accent colors change', async () => {
    const updateThemeMock = {
      mutateAsync: vi.fn().mockResolvedValue(baseTheme),
      isPending: false,
    };
    (useUpdateCompanyTheme as unknown as vi.Mock).mockReturnValue(updateThemeMock);

    renderWithProviders(<CompanySettings />);

    fireEvent.change(screen.getByLabelText('Primary color'), { target: { value: '#111111' } });
    await userEvent.click(screen.getByRole('button', { name: /save theme/i }));

    await waitFor(() => {
      expect(updateThemeMock.mutateAsync).toHaveBeenCalledWith({
        primaryColor: '#111111',
        secondaryColor: baseTheme.secondaryColor,
        backgroundColor: baseTheme.backgroundColor,
        useCover: true,
      });
    });
  });

  it('uploads a cover photo when saving after selecting a file', async () => {
    const uploadMock = {
      mutateAsync: vi.fn().mockResolvedValue(baseTheme),
      isPending: false,
    };
    const updateThemeMock = {
      mutateAsync: vi.fn().mockResolvedValue(baseTheme),
      isPending: false,
    };
    (useUploadThemeCover as unknown as vi.Mock).mockReturnValue(uploadMock);
    (useUpdateCompanyTheme as unknown as vi.Mock).mockReturnValue(updateThemeMock);

    renderWithProviders(<CompanySettings />);

    const fileInput = screen.getByLabelText('Upload cover photo') as HTMLInputElement;
    const file = new File(['cover'], 'cover.png', { type: 'image/png' });
    await userEvent.upload(fileInput, file);

    expect(uploadMock.mutateAsync).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /save theme/i }));

    await waitFor(() => {
      expect(uploadMock.mutateAsync).toHaveBeenCalledWith(file);
      expect(updateThemeMock.mutateAsync).toHaveBeenCalledWith({
        primaryColor: baseTheme.primaryColor,
        secondaryColor: baseTheme.secondaryColor,
        backgroundColor: baseTheme.backgroundColor,
        useCover: true,
      });
    });
  });

  it('hides theme controls for non-admin users', () => {
    (useAuthStore as unknown as vi.Mock).mockReturnValue({ user: createMockUser({ role: 'USER' }) });

    renderWithProviders(<CompanySettings />);

    expect(screen.queryByRole('button', { name: /save theme/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('theme-preview')).toBeInTheDocument();
  });
});
