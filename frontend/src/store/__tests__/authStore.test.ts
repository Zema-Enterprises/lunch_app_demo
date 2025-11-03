import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../authStore';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('../../lib/api/client', () => ({
  default: {
    get: mockGet,
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}));

describe('authStore.loadUser', () => {
  beforeEach(() => {
    mockGet.mockReset();
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('hydrates user data when auth/me returns a user object directly under data', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'admin@demo.com',
      name: 'Demo Admin',
      role: 'ADMIN',
      companyId: 'company-1',
    };

    mockGet.mockResolvedValue({ data: { data: mockUser } });

    localStorage.setItem('token', 'test-token');
    useAuthStore.setState({
      ...useAuthStore.getState(),
      token: 'test-token',
      isAuthenticated: true,
    });

    await useAuthStore.getState().loadUser();

    const state = useAuthStore.getState();
    expect(mockGet).toHaveBeenCalledWith('/auth/me');
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });
});
