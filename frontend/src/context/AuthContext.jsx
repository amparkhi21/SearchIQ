import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.api';
import { getItem, setItem, removeItem, getToken, setToken, USER_KEY } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getItem(USER_KEY, null));
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  /** Single place that keeps React state and localStorage in sync (including full sign-out). */
  const persist = useCallback((nextUser, nextToken) => {
    setUser(nextUser || null);
    if (nextUser) setItem(USER_KEY, nextUser);
    else removeItem(USER_KEY);
    if (nextToken !== undefined) setToken(nextUser ? nextToken : null);
    if (!nextUser) setToken(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) { setLoading(false); return; }
      try {
        const d = await authApi.me();
        if (!cancelled) persist(d.user);
      } catch (e) {
        // Only drop the session on an auth failure — keep it if the API is simply unreachable.
        if (!cancelled && e?.response?.status === 401) persist(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const onLogout = () => persist(null);
    window.addEventListener('searchiq:logout', onLogout);
    return () => { cancelled = true; window.removeEventListener('searchiq:logout', onLogout); };
  }, [persist]);

  const login = useCallback(async (payload) => {
    const d = await authApi.login(payload);
    persist(d.user, d.accessToken);
    return d.user;
  }, [persist]);

  const register = useCallback(async (payload) => {
    const d = await authApi.register(payload);
    persist(d.user, d.accessToken);
    return d.user;
  }, [persist]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* token may already be invalid — still sign out locally */ }
    persist(null);
  }, [persist]);

  const updateUser = useCallback((next) => persist(next), [persist]);

  const value = useMemo(() => ({
    user, loading, login, register, logout, updateUser,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
  }), [user, loading, login, register, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
