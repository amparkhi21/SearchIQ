import { api, unwrap } from './axios';

export const getCart = async () => unwrap(await api.get('/cart'));
export const addToCart = async (productId, quantity = 1) => unwrap(await api.post(`/cart/items/${productId}`, { quantity }));
export const updateCartItem = async (productId, quantity) => unwrap(await api.put(`/cart/items/${productId}`, { quantity }));
export const removeFromCart = async (productId) => unwrap(await api.delete(`/cart/items/${productId}`));
export const clearCart = async () => unwrap(await api.delete('/cart'));
