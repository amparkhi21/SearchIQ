import axios from 'axios';
import { getToken, setToken, removeItem, setItem, USER_KEY } from '../utils/storage';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

let refreshPromise = null;
const NO_REFRESH = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/logout'];

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const skip =
      error?.response?.status !== 401 ||
      !original ||
      original._retry ||
      !getToken() ||
      NO_REFRESH.some((p) => original.url?.includes(p));
    if (skip) return Promise.reject(error);

    original._retry = true;
    try {
      refreshPromise ||= api.post('/auth/refresh', {}).finally(() => { refreshPromise = null; });
      const response = await refreshPromise;
      const { accessToken, user } = response?.data?.data || {};
      if (!accessToken) throw error;
      setToken(accessToken);
      if (user) setItem(USER_KEY, user);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      setToken(null);
      removeItem(USER_KEY);
      window.dispatchEvent(new Event('searchiq:logout'));
      return Promise.reject(refreshError);
    }
  },
);

/** `{ success, message, data, meta }` → `data` */
export const unwrap = (response) => response?.data?.data ?? {};
/** Same, but keeps pagination `meta` alongside the data. */
export const unwrapWithMeta = (response) => ({ ...(response?.data?.data ?? {}), meta: response?.data?.meta ?? {} });

export const errorMessage = (error, fallback = 'Something went wrong') => {
  const body = error?.response?.data;
  if (body?.errors?.length) {
    const first = body.errors[0];
    return first?.message || body.message || fallback;
  }
  if (body?.message) return body.message;
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error?.message === 'Network Error') return 'Cannot reach the server. Check that the backend is running.';
  return error?.message || fallback;
};
export const isStatus = (error, status) => error?.response?.status === status;
