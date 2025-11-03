import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import { createMockEvent, createMockRestaurant } from '@/test/utils/factories';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/lib/api/hooks', () => ({
  useEvents: vi.fn(() => ({ data: [], isLoading: false })),
  useRestaurants: vi.fn(() => ({ data: [], isLoading: false })),
  useUserStats: vi.fn(() => ({ data: { thisWeekOrders: 0, totalSpent: 0 }, isLoading: false })),
}));

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Page - Create Event Navigation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    const hooks = await import('@/lib/api/hooks');
    vi.mocked(hooks.useEvents).mockReturnValue({
      data: [createMockEvent({ status: 'OPEN' })],
      isLoading: false,
    } as any);
    vi.mocked(hooks.useRestaurants).mockReturnValue({
      data: [createMockRestaurant()],
      isLoading: false,
    } as any);
    vi.mocked(hooks.useUserStats).mockReturnValue({
      data: { thisWeekOrders: 2, totalSpent: 42 },
      isLoading: false,
    } as any);
  });

  it('navigates to events page with create modal request when Create Event button is clicked', async () => {
    renderDashboard();
    const user = userEvent.setup();

    const button = screen.getByRole('button', { name: /create event/i });
    await user.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/events', { state: { openCreateEvent: true } });
  });
});
