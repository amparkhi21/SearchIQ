import { api, unwrap, unwrapWithMeta } from './axios';

/** → { windowDays, summary:{totalSearches,uniqueUsers,zeroResultSearches,zeroResultRate(0-1),totalResultsReturned}, topQueries[{query,searches}], zeroResultQueries, modeUsage[{mode,searches}], daily[{date,searches,zeroResultSearches}] } */
export const searchAnalytics = async (params = {}) => unwrap(await api.get('/admin/analytics/search', { params }));
/** → { orders, meta } */
export const listAdminOrders = async (params = {}) => unwrapWithMeta(await api.get('/admin/orders', { params }));
export const getAdminOrder = async (id) => unwrap(await api.get(`/admin/orders/${id}`));
export const updateOrderStatus = async (id, status, note) => unwrap(await api.patch(`/admin/orders/${id}/status`, note ? { status, note } : { status }));
