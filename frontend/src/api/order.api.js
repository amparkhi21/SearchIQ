import { api, unwrap, unwrapWithMeta } from './axios';

/** → { orders, meta } */
export const listOrders = async (params = {}) => unwrapWithMeta(await api.get('/orders', { params }));
export const getOrder = async (id) => unwrap(await api.get(`/orders/${id}`));
export const createOrder = async (payload) => unwrap(await api.post('/orders', payload));
export const cancelOrder = async (id, reason = '') => unwrap(await api.post(`/orders/${id}/cancel`, reason ? { reason } : {}));
