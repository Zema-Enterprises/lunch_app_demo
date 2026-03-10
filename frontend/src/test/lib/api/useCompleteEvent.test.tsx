import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCompleteEvent } from '@/lib/api/hooks';
import apiClient from '@/lib/api/client';
import { useNotificationStore } from '@/store/notificationStore';

vi.mock('@/lib/api/client', () => ({
  __esModule: true,
  default: { post: vi.fn() },
}));

vi.mock('@/store/notificationStore', () => ({
  useNotificationStore: vi.fn(),
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

const mockAddToast = vi.fn();

describe('useCompleteEvent', () => {
  beforeEach(() => {
    mockAddToast.mockReset();
    (apiClient.post as any).mockReset();
    (useNotificationStore as any).mockReturnValue({ addToast: mockAddToast });
  });

  it('shows success when completion succeeds', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: { data: { completed: true, message: 'Event auto-completed' } },
    });

    const { result } = renderHook(() => useCompleteEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('event-1');
    });

    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'success',
      message: 'Event completed successfully!',
    });
  });

  it('shows not-ready message when completion fails', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: { data: { completed: false, message: 'Event not ready for completion' } },
    });

    const { result } = renderHook(() => useCompleteEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('event-1');
    });

    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'Event not ready for completion',
    });
    expect(mockAddToast).not.toHaveBeenCalledWith({
      type: 'success',
      message: 'Event completed successfully!',
    });
  });
});
