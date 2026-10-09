import { HTTP_STATUS } from '../constants.js';
import * as cartService from '../services/cart.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getCart = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Cart fetched', { cart: await cartService.getCart(req.user) }).send(res));
export const addToCart = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Product added to cart', { cart: await cartService.addToCart(req.user, req.params.productId, req.body.quantity) }).send(res));
export const updateCartItem = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Cart updated', { cart: await cartService.updateCartItem(req.user, req.params.productId, req.body.quantity) }).send(res));
export const removeFromCart = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Product removed from cart', { cart: await cartService.removeFromCart(req.user, req.params.productId) }).send(res));
export const clearCart = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Cart cleared', { cart: await cartService.clearCart(req.user) }).send(res));
