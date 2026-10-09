import { api, unwrap } from './axios';

export const getProfile = async () => unwrap(await api.get('/users/profile'));
export const updateProfile = async (payload) => unwrap(await api.put('/users/profile', payload));
export const changePassword = async (payload) => unwrap(await api.put('/users/password', payload));
export const addAddress = async (payload) => unwrap(await api.post('/users/addresses', payload));
export const removeAddress = async (id) => unwrap(await api.delete(`/users/addresses/${id}`));
