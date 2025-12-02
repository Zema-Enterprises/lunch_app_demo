import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRedeemInvite } from '@/lib/api/hooks';
import apiClient from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  __esModule: true,
  default: { post: vi.fn() },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const setPathname = (path: string) => {
  window.history.pushState({}, '', path);
};

describe('useRedeemInvite', () => {
  beforeEach(() => {
    (apiClient.post as any).mockReset();
  });

  it('posts to tenant-scoped invite redemption when slug is present', async () => {
    setPathname('/c/acme/invite/token-123');
    (apiClient.post as any).mockResolvedValue({
      data: { data: { token: 'jwt', user: { id: 'user-1' } } },
    });

    const { result } = renderHook(() => useRedeemInvite(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      token: 'token-123',
      name: 'Tenant User',
      password: 'SecurePass123!',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/invites/acme/redeem', {
      token: 'token-123',
      name: 'Tenant User',
      password: 'SecurePass123!',
    });
  });

  it('posts to global invite redemption when slug is absent', async () => {
    setPathname('/invite/token-xyz');
    (apiClient.post as any).mockResolvedValue({
      data: { data: { token: 'jwt', user: { id: 'user-2' } } },
    });

    const { result } = renderHook(() => useRedeemInvite(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      token: 'token-xyz',
      name: 'Global User',
      password: 'SecurePass123!',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/auth/invites/redeem', {
      token: 'token-xyz',
      name: 'Global User',
      password: 'SecurePass123!',
    });
  });
});
