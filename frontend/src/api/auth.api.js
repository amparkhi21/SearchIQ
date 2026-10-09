import { api, unwrap } from './axios';

export const login = async (payload) => unwrap(await api.post('/auth/login', payload));
export const register = async (payload) => unwrap(await api.post('/auth/register', payload));
export const me = async () => unwrap(await api.get('/auth/me'));
export const logout = async () => unwrap(await api.post('/auth/logout', {}));
