import { api, unwrap, unwrapWithMeta } from './axios';

/** → { reviews, meta } */
export const listReviews = async (productId, params = {}) => unwrapWithMeta(await api.get(`/reviews/product/${productId}`, { params }));
export const createReview = async (productId, payload) => unwrap(await api.post(`/reviews/product/${productId}`, payload));
export const updateReview = async (id, payload) => unwrap(await api.put(`/reviews/${id}`, payload));
export const deleteReview = async (id) => unwrap(await api.delete(`/reviews/${id}`));
