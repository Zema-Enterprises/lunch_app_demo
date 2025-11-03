import React from 'react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/test/mocks/server';
import { useNotificationAnalytics } from '@/lib/api/hooks';

const API_BASE_URL = 'http://localhost:5000/api';

describe('useNotificationAnalytics', () => {
  it('fetches analytics summary', async () => {
    server.use(
      http.get(`${API_BASE_URL}/notifications/analytics/summary`, () => {
        return HttpResponse.json({
          data: {
            companyId: 'company_1',
            totals: { notifications: 10, unread: 2 },
            delivery: {
              REALTIME: { SUCCESS: 8 },
              PUSH: { SUCCESS: 1, FAILED: 1 },
            },
          },
        });
      })
    );

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useNotificationAnalytics(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totals.unread).toBe(2);
    expect(result.current.data?.delivery.PUSH.FAILED).toBe(1);
  });
});
