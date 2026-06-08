import axios from 'axios';

const normalizeApiUrl = (rawUrl) => {
  if (!rawUrl) return 'http://localhost:5000/api/v1';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('//')) return `http:${trimmed}`;
  if (trimmed.startsWith(':')) return `http://localhost${trimmed}`;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
  if (/^(localhost|127\.0\.0\.1|\[::1\])/.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
};

export const API_BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1');

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send the httpOnly refreshToken cookie automatically
});

/* ── Request interceptor: attach access token ───────────── */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response interceptor: auto-refresh on 401 ──────────── */
let isRefreshing = false;
let failedQueue = [];  // requests waiting while refresh is in-flight

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only try refresh once per request and only for 401s
    // Skip the refresh-token endpoint itself to avoid infinite loops
    if (
      error.response?.status === 401 &&
      !originalRequest._retried &&
      !originalRequest.url?.includes('/auth/refresh-token') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retried = true;
      isRefreshing = true;

      try {
        const { data } = await axiosInstance.post('/auth/refresh-token');
        const newToken = data?.data?.accessToken;
        if (newToken) {
          localStorage.setItem('token', newToken);
          axiosInstance.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed — clear tokens and let the app handle redirect
        localStorage.removeItem('token');
        window.dispatchEvent(new CustomEvent('auth:logout'));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
