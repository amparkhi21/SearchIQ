import { HTTP_STATUS } from '../constants.js';
import * as reviewService from '../services/review.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listProductReviews = asyncHandler(async (req, res) => { const result = await reviewService.listProductReviews(req.params.productId, req.query); return new ApiResponse(HTTP_STATUS.OK, 'Reviews fetched', { reviews: result.reviews }, result.meta).send(res); });
export const createReview = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.CREATED, 'Review created', { review: await reviewService.createReview(req.user, req.params.productId, req.body) }).send(res));
export const updateReview = asyncHandler(async (req, res) => new ApiResponse(HTTP_STATUS.OK, 'Review updated', { review: await reviewService.updateReview(req.user, req.params.reviewId, req.body) }).send(res));
export const deleteReview = asyncHandler(async (req, res) => { await reviewService.deleteReview(req.user, req.params.reviewId); return new ApiResponse(HTTP_STATUS.OK, 'Review deleted').send(res); });
