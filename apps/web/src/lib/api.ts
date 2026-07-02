import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  withCredentials: true, // send HttpOnly refresh token cookie
  timeout: 15_000,
});

// ── Request interceptor: attach access token ────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cerp_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ───────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await api.post<{ data: { accessToken: string } }>(
          '/auth/refresh',
        );
        const newToken = res.data.data.accessToken;
        localStorage.setItem('cerp_access_token', newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('cerp_access_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Typed API helpers ────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateFcmToken: (fcmToken: string) =>
    api.patch('/auth/fcm-token', { fcmToken }),
};

export const areasApi = {
  findNearby: (lat: number, lng: number, radius?: number) =>
    api.get('/areas', { params: { lat, lng, radius } }),
  findOne: (areaId: string) => api.get(`/areas/${areaId}`),
  create: (data: unknown) => api.post('/areas', data),
  update: (areaId: string, data: unknown) => api.patch(`/areas/${areaId}`, data),
  remove: (areaId: string) => api.delete(`/areas/${areaId}`),
  join: (data: { token?: string; code?: string; lat?: number; lng?: number }) =>
    api.post('/areas/join', data),
  leave: (areaId: string) => api.delete(`/areas/${areaId}/leave`),
  members: (areaId: string) => api.get(`/areas/${areaId}/members`),
  removeMember: (areaId: string, userId: string) =>
    api.delete(`/areas/${areaId}/members/${userId}`),
  qrCode: (areaId: string) => api.get(`/areas/${areaId}/qr-code`),
  rotateQr: (areaId: string) => api.post(`/areas/${areaId}/qr-code/rotate`),
  myAreas: () => api.get('/users/me/areas'),
};

export const incidentsApi = {
  create: (areaId: string, data: unknown) =>
    api.post(`/areas/${areaId}/incidents`, data),
  findAll: (areaId: string, status?: string) =>
    api.get(`/areas/${areaId}/incidents`, { params: { status } }),
  findOne: (areaId: string, incidentId: string) =>
    api.get(`/areas/${areaId}/incidents/${incidentId}`),
  close: (areaId: string, incidentId: string, data?: unknown) =>
    api.patch(`/areas/${areaId}/incidents/${incidentId}/close`, data),
  respond: (areaId: string, incidentId: string, data?: unknown) =>
    api.post(`/areas/${areaId}/incidents/${incidentId}/respond`, data),
  postUpdate: (areaId: string, incidentId: string, message: string) =>
    api.post(`/areas/${areaId}/incidents/${incidentId}/updates`, { message }),
  getUpdates: (areaId: string, incidentId: string) =>
    api.get(`/areas/${areaId}/incidents/${incidentId}/updates`),
  getResponders: (areaId: string, incidentId: string) =>
    api.get(`/areas/${areaId}/incidents/${incidentId}/responders`),
};

export const safePointsApi = {
  findAll: (areaId: string, type?: string) =>
    api.get(`/areas/${areaId}/safe-points`, { params: { type } }),
  create: (areaId: string, data: unknown) =>
    api.post(`/areas/${areaId}/safe-points`, data),
  update: (areaId: string, id: string, data: unknown) =>
    api.patch(`/areas/${areaId}/safe-points/${id}`, data),
  remove: (areaId: string, id: string) =>
    api.delete(`/areas/${areaId}/safe-points/${id}`),
};

export const notificationsApi = {
  findAll: (params?: { limit?: number; unread_only?: boolean }) =>
    api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  registerFcmToken: (fcmToken: string) =>
    api.patch('/auth/fcm-token', { fcmToken }),
};

export const adminApi = {
  listAllAreas: (includeInactive = false) =>
    api.get('/admin/areas', { params: { include_inactive: includeInactive } }),
  forceDeleteArea: (areaId: string) =>
    api.delete(`/admin/areas/${areaId}`),
};

export const analyticsApi = {
  getStats: (areaId: string) => api.get(`/areas/${areaId}/analytics`),
  getBreakdown: (areaId: string) => api.get(`/areas/${areaId}/analytics/breakdown`),
  sendBroadcast: (areaId: string, data: unknown) =>
    api.post(`/areas/${areaId}/broadcasts`, data),
  listBroadcasts: (areaId: string) => api.get(`/areas/${areaId}/broadcasts`),
};
