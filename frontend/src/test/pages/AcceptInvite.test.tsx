import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import AcceptInvite from '@/pages/AcceptInvite';
import { createMockUser } from '../utils/factories';

vi.mock('@/lib/api/hooks', () => ({
  useRedeemInvite: vi.fn(),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

import { useRedeemInvite } from '@/lib/api/hooks';
import { useAuthStore } from '@/store/authStore';

const renderWithRouter = (initialEntry = '/invite/sample-token') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/invite/:token" element={<AcceptInvite />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AcceptInvite', () => {
  const mockSetAuthSession = vi.fn();
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetAuthSession.mockReset();
    mockMutateAsync.mockReset();

    (useAuthStore as any).mockReturnValue({
      setAuthSession: mockSetAuthSession,
    });

    (useRedeemInvite as any).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  it('submits invite data and sets auth session', async () => {
    const user = userEvent.setup();
    const mockUser = createMockUser();
    mockMutateAsync.mockResolvedValue({
      token: 'new-token',
      user: mockUser,
    });

    renderWithRouter();

    await user.type(screen.getByLabelText('Full Name'), 'Invited User');
    await user.type(screen.getByLabelText(/^Password$/), 'SecurePass123!');
    await user.type(screen.getByLabelText('Confirm Password'), 'SecurePass123!');

    await user.click(screen.getByRole('button', { name: /join workspace/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      token: 'sample-token',
      name: 'Invited User',
      password: 'SecurePass123!',
    });
    expect(mockSetAuthSession).toHaveBeenCalledWith('new-token', mockUser);
    expect(screen.getByText(/your invitation has been accepted/i)).toBeInTheDocument();
  });

  it('shows error message when passwords do not match', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.type(screen.getByLabelText('Full Name'), 'Invited User');
    await user.type(screen.getByLabelText(/^Password$/), 'SecurePass123!');
    await user.type(screen.getByLabelText('Confirm Password'), 'MismatchPass!');

    await user.click(screen.getByRole('button', { name: /join workspace/i }));

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });
});
