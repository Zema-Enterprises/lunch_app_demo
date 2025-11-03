import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRestaurants, useEvents, useUserOrders } from '@/lib/api/hooks';

// Wrapper for hooks that need QueryClient
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

describe('API Hooks', () => {
  describe('useRestaurants', () => {
    it('fetches restaurants successfully', async () => {
      const { result } = renderHook(() => useRestaurants(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
      expect(result.current.data?.length).toBeGreaterThan(0);
    });

    it('returns restaurant with correct structure', async () => {
      const { result } = renderHook(() => useRestaurants(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const firstRestaurant = result.current.data?.[0];
      expect(firstRestaurant).toHaveProperty('id');
      expect(firstRestaurant).toHaveProperty('name');
      expect(firstRestaurant).toHaveProperty('cuisine');
      expect(firstRestaurant).toHaveProperty('hasMenu');
    });
  });

  describe('useEvents', () => {
    it('fetches events successfully', async () => {
      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
    });

    it('filters events by status', async () => {
      const { result } = renderHook(() => useEvents('OPEN'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const openEvents = result.current.data || [];
      expect(openEvents.every((event) => event.status === 'OPEN')).toBe(true);
    });
  });

  describe('useUserOrders', () => {
    it('fetches user orders successfully', async () => {
      const { result } = renderHook(() => useUserOrders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
    });

    it('returns orders with order items', async () => {
      const { result } = renderHook(() => useUserOrders(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const orders = result.current.data || [];
      if (orders.length > 0) {
        const firstOrder = orders[0];
        expect(firstOrder).toHaveProperty('id');
        expect(firstOrder).toHaveProperty('totalAmount');
        expect(firstOrder).toHaveProperty('orderItems');
      }
    });
  });
});
