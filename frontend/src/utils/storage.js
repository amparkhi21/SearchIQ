export const TOKEN_KEY = 'searchiq_access_token';
export const USER_KEY = 'searchiq_user';

export const getItem = (key, fallback = null) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
};
export const setItem = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};
export const removeItem = (key) => {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
};
export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (token) => {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
};
