import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../lib/api';
import { disconnectSocket } from '../lib/socket';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login({ email, password });
          const { user, accessToken } = res.data.data;
          localStorage.setItem('cerp_access_token', accessToken);
          set({ user, accessToken, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true });
        try {
          const res = await authApi.register({ email, password, name });
          const { user, accessToken } = res.data.data;
          localStorage.setItem('cerp_access_token', accessToken);
          set({ user, accessToken, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {}
        localStorage.removeItem('cerp_access_token');
        disconnectSocket();
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),
      setToken: (token) => set({ accessToken: token }),

      hydrate: async () => {
        const token = localStorage.getItem('cerp_access_token');
        if (!token) return;
        try {
          const res = await authApi.me();
          set({ user: res.data.data, isAuthenticated: true, accessToken: token });
        } catch {
          localStorage.removeItem('cerp_access_token');
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'cerp-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
