import axios from 'axios';
import Cookies from 'js-cookie';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const getStorageUrl = (path: string | null | undefined): string => {
  if (!path) return '';

  const cleanBase = (API_BASE_URL || '').replace(/\/+$/, '');

  // 1. Ganti host localhost / 127.0.0.1 (dengan port apa pun atau tanpa port) ke cleanBase
  let normalized = path.replace(
    /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/(?:storage\/)?/i,
    `${cleanBase}/storage/`
  );

  // 2. Jika sudah merupakan URL absolut http:// atau https://
  if (/^https?:\/\//i.test(normalized)) {
    // Jika frontend berjalan di HTTPS atau API_BASE_URL HTTPS, upgrade ke https:// agar tidak terblokir Mixed Content
    const isHttpsEnv = (typeof window !== 'undefined' && window.location.protocol === 'https:') || cleanBase.startsWith('https://');
    if (isHttpsEnv && normalized.startsWith('http://') && !normalized.includes('localhost') && !normalized.includes('127.0.0.1')) {
      normalized = normalized.replace(/^http:\/\//i, 'https://');
    }
    return normalized;
  }

  // 3. Jika berupa path relatif
  const trimmed = normalized.replace(/^\/+/, '');
  if (trimmed.startsWith('storage/')) {
    return `${cleanBase}/${trimmed}`;
  }
  return `${cleanBase}/storage/${trimmed}`;
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
