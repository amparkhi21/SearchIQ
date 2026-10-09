import { api, unwrap } from './axios';

export const similarProducts = async (id, limit = 8) => unwrap(await api.get(`/recommendations/similar/${id}`, { params: { limit } }));
export const recommendations = async (limit = 8) => unwrap(await api.get('/recommendations/for-me', { params: { limit } }));
export const recordViewed = async (id) => unwrap(await api.post(`/recommendations/viewed/${id}`));
export const recentlyViewed = async (limit = 8) => unwrap(await api.get('/recommendations/recently-viewed', { params: { limit } }));
export const clearRecentlyViewed = async () => unwrap(await api.delete('/recommendations/recently-viewed'));
