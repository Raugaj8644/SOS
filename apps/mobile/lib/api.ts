import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Change this to your backend IP when testing on a real device ──────────────
export const API_BASE = 'http://192.168.1.7:4000';
const TOKEN_KEY = 'cerp_access_token';

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 15_000,
  withCredentials: false, // React Native doesn't support HttpOnly cookies
});

// ── Token helpers ─────────────────────────────────────────────────────────────
export const tokenStorage = {
  get:    () => SecureStore.getItemAsync(TOKEN_KEY),
  set:    (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t),
  remove: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

// ── Attach access token on every request ─────────────────────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.get();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: { resolve: (t: string) => void; reject: (e: unknown) => void }[] = [];

const processQueue = (err: unknown, token: string | null) => {
  failedQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const orig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          orig.headers.Authorization = `Bearer ${token}`;
          return api(orig);
        });
      }
      orig._retry = true;
      isRefreshing = true;
      try {
        // Refresh using stored refresh token (sent in cookie on web; here use separate endpoint)
        const res = await api.post<{ data: { accessToken: string } }>('/auth/refresh');
        const newToken = res.data.data.accessToken;
        await tokenStorage.set(newToken);
        processQueue(null, newToken);
        orig.headers.Authorization = `Bearer ${newToken}`;
        return api(orig);
      } catch (e) {
        processQueue(e, null);
        await tokenStorage.remove();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

// ── Typed API helpers (mirrors web/src/lib/api.ts) ───────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const areasApi = {
  myAreas: () => api.get('/users/me/areas'),
  findOne:  (id: string) => api.get(`/areas/${id}`),
  join:     (data: { token?: string; lat?: number; lng?: number }) =>
    api.post('/areas/join', data),
  qrCode:   (id: string) => api.get(`/areas/${id}/qr-code`),
  rotateQr: (id: string) => api.post(`/areas/${id}/qr-code/rotate`),
};

export const incidentsApi = {
  findAll: (areaId: string, status?: string) =>
    api.get(`/areas/${areaId}/incidents`, { params: { status } }),
  create: (areaId: string, data: unknown) =>
    api.post(`/areas/${areaId}/incidents`, data),
};

export const notificationsApi = {
  findAll: (params?: { limit?: number; unread_only?: boolean }) =>
    api.get('/notifications', { params }),
  markRead:    (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};
