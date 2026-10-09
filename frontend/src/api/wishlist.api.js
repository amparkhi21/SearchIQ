import { api, unwrap } from './axios';

/** → { wishlist: { products: [...] } } */
export const getWishlist = async () => unwrap(await api.get('/wishlist'));
export const addToWishlist = async (productId) => unwrap(await api.post(`/wishlist/${productId}`));
export const removeFromWishlist = async (productId) => unwrap(await api.delete(`/wishlist/${productId}`));
