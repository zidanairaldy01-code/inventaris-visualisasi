import axios from 'axios';
import Cookies from 'js-cookie';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const getStorageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  // Fix localhost or 127.0.0.1 on port 80 / without port (when Laravel APP_URL default was http://localhost)
  if (/^https?:\/\/localhost(?::80)?(\/.*)$/.test(path)) {
    const match = path.match(/^https?:\/\/localhost(?::80)?(\/.*)$/);
    return `${API_BASE_URL}${match ? match[1] : ''}`;
  }
  if (/^https?:\/\/127\.0\.0\.1(?::80)?(\/.*)$/.test(path)) {
    const match = path.match(/^https?:\/\/127\.0\.0\.1(?::80)?(\/.*)$/);
    return `${API_BASE_URL}${match ? match[1] : ''}`;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Delete Content-Type for FormData so axios/browser generates the correct multipart boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      Cookies.remove('auth_token');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_last_active');
        if (!window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
          window.location.href = '/login?expired=1';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
