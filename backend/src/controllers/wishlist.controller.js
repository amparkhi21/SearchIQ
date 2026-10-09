import { HTTP_STATUS } from '../constants.js';
import * as wishlistService from '../services/wishlist.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getWishlist = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Wishlist fetched', { wishlist: await wishlistService.getWishlist(req.user) }).send(res));
export const addToWishlist = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Product added to wishlist', { wishlist: await wishlistService.addToWishlist(req.user, req.params.productId) }).send(res));
export const removeFromWishlist = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Product removed from wishlist', { wishlist: await wishlistService.removeFromWishlist(req.user, req.params.productId) }).send(res));
