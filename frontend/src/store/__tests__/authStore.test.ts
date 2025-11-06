import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../authStore';

const apiClientMock = vi.hoisted(() => {
  const register = vi.fn<(listener: (token: string | null) => void) => void>();
  const storage: { listener?: (token: string | null) => void } = {};

  register.mockImplementation((listener) => {
    storage.listener = listener;
  });

  return {
    get: vi.fn(),
    post: vi.fn(),
    register,
    setToken: vi.fn(),
    storage,
  };
});

vi.mock('../../lib/api/client', () => ({
  default: {
    get: apiClientMock.get,
    post: apiClientMock.post,
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
  registerAccessTokenListener: apiClientMock.register,
  setAccessToken: apiClientMock.setToken,
}));

describe('authStore', () => {
  beforeEach(() => {
    apiClientMock.get.mockReset();
    apiClientMock.post.mockReset();
    apiClientMock.setToken.mockReset();
    useAuthStore.setState({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('hydrates user after refreshing access token', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'admin@demo.com',
      name: 'Demo Admin',
      role: 'ADMIN',
      companyId: 'company-1',
    };

    apiClientMock.post.mockResolvedValueOnce({ data: { data: { token: 'new-access-token' } } });
    apiClientMock.get.mockResolvedValueOnce({ data: { data: mockUser } });

    await useAuthStore.getState().loadUser();

    expect(apiClientMock.post).toHaveBeenCalledWith('/auth/refresh');
    expect(apiClientMock.get).toHaveBeenCalledWith('/auth/me');
    expect(apiClientMock.setToken).toHaveBeenCalledWith('new-access-token');

    const state = useAuthStore.getState();
    expect(state.token).toBe('new-access-token');
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('clears auth state when refresh fails', async () => {
    apiClientMock.post.mockRejectedValueOnce(new Error('refresh failed'));

    await useAuthStore.getState().loadUser();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('updates token when interceptor listener fires', () => {
    const listener = apiClientMock.storage.listener;
    expect(listener).toBeDefined();

    listener?.('interceptor-token');
    expect(useAuthStore.getState().token).toBe('interceptor-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    listener?.(null);
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
