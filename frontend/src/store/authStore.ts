import { create } from 'zustand';
import { User, Company } from '@/types';
import apiClient, { registerAccessTokenListener, setAccessToken } from '@/lib/api/client';

interface AuthState {
  user: User | null;
  company: Company | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearAuth: () => void;
  setAuthSession: (token: string, user: User) => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  companyName: string;
  companyDomain: string;
  companySlug: string;
}

export const useAuthStore = create<AuthState>((set, get) => {
  registerAccessTokenListener((token) => {
    set((state) => ({
      token,
      isAuthenticated: !!token,
      user: token ? state.user : null,
      company: token ? state.company : null,
      isLoading: token ? state.isLoading : false,
    }));
  });

  return {
    user: null,
    company: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    hasHydrated: false,

    clearAuth: () => {
      setAccessToken(null);
      set({
        user: null,
        company: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        hasHydrated: true,
      });
    },

    setAuthSession: (token: string, user: User) => {
      setAccessToken(token);
      set({
        user,
        company: null,
        token,
        isAuthenticated: true,
        isLoading: false,
        hasHydrated: true,
      });
    },

    login: async (email: string, password: string) => {
      set({ isLoading: true });
      try {
        const response = await apiClient.post<{ data: { token: string; user: User } }>('/auth/login', {
          email,
          password,
        });

        const { token, user } = response.data.data;
        get().setAuthSession(token, user);
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    register: async (data: RegisterData) => {
      set({ isLoading: true });
      try {
        const response = await apiClient.post<{ data: { token: string; user: User } }>('/auth/register', data);
        const { token, user } = response.data.data;
        get().setAuthSession(token, user);
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    logout: async () => {
      try {
        await apiClient.post('/auth/logout');
      } catch (error) {
        // Swallow errors to ensure local state clears even if server-side logout fails
      } finally {
        get().clearAuth();
      }
    },

    loadUser: async () => {
      set({ isLoading: true });
      try {
        let token = get().token;

        if (!token) {
          const refreshResponse = await apiClient.post<{ data: { token: string } }>('/auth/refresh');
          token = refreshResponse.data.data.token;
          setAccessToken(token);
          set({ token, isAuthenticated: true });
        }

        const response = await apiClient.get<{ data: User }>('/auth/me');
        set({
          user: response.data.data,
          company: null,
          token,
          isAuthenticated: true,
          isLoading: false,
          hasHydrated: true,
        });
      } catch (error) {
        get().clearAuth();
      } finally {
        set((state) => ({
          ...state,
          isLoading: false,
          hasHydrated: true,
        }));
      }
    },
  };
});
