import { api, unwrap, unwrapWithMeta } from './axios';

/** → { notifications, unreadCount, meta } */
export const listNotifications = async (params = {}) => unwrapWithMeta(await api.get('/notifications', { params }));
export const markRead = async (id) => unwrap(await api.patch(`/notifications/${id}/read`));
export const markAllRead = async () => unwrap(await api.post('/notifications/read-all'));
