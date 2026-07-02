import { create } from 'zustand';
import { authApi, tokenStorage } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login:   (email: string, password: string) => Promise<void>;
  logout:  () => Promise<void>;
  loadMe:  () => Promise<void>;
  setUser: (u: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: true }),

  loadMe: async () => {
    try {
      const token = await tokenStorage.get();
      if (!token) { set({ isLoading: false, isAuthenticated: false }); return; }
      const res = await authApi.me();
      set({ user: res.data.data, isAuthenticated: true, isLoading: false });
    } catch {
      await tokenStorage.remove();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await authApi.login({ email, password });
    const { accessToken, user } = res.data.data;
    await tokenStorage.set(accessToken);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    await tokenStorage.remove();
    set({ user: null, isAuthenticated: false });
  },
}));
