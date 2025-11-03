import { create } from 'zustand';
import { User, Company } from '../types';
import apiClient from '../lib/api/client';

interface AuthState {
  user: User | null;
  company: Company | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  companyName: string;
  companyDomain: string;
  companySlug: string;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  company: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post<{ data: { token: string; user: User } }>('/auth/login', {
        email,
        password,
      });
      const { token, user } = response.data.data;  // Unwrap { data: ... }
      
      localStorage.setItem('token', token);
      set({
        user,
        company: null,  // Company no longer returned from login, will be fetched separately if needed
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post<{ data: { token: string; user: User } }>('/auth/register', data);
      const { token, user } = response.data.data;  // Unwrap { data: ... }
      
      localStorage.setItem('token', token);
      set({
        user,
        company: null,  // Company no longer returned from register, will be fetched separately if needed
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
    });
  },

  loadUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false });
      return;
    }

    set({ isLoading: true });
    try {
      const response = await apiClient.get<{ data: User }>('/auth/me');
      set({
        user: response.data.data,
        company: null,  // Company no longer returned, fetch separately if needed
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('token');
      set({
        user: null,
        company: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
