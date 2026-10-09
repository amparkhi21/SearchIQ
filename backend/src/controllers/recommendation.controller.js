import { HTTP_STATUS } from '../constants.js';
import * as recommendationService from '../services/recommendation.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const similarProducts = asyncHandler(async (req, res) => {
  const products = await recommendationService.getSimilarProducts(req.params.id, req.query.limit);
  return new ApiResponse(HTTP_STATUS.OK, 'Similar products fetched', { products }).send(res);
});

export const recommendationsForMe = asyncHandler(async (req, res) => {
  const products = await recommendationService.getRecommendations(req.user, req.query.limit);
  return new ApiResponse(HTTP_STATUS.OK, 'Recommendations fetched', { products }).send(res);
});

export const recordViewedProduct = asyncHandler(async (req, res) => {
  const viewed = await recommendationService.recordRecentlyViewed(req.user, req.params.id);
  return new ApiResponse(HTTP_STATUS.OK, 'Recently viewed updated', { viewed }).send(res);
});

export const recentlyViewed = asyncHandler(async (req, res) => {
  const entries = await recommendationService.listRecentlyViewed(req.user, req.query.limit);
  return new ApiResponse(HTTP_STATUS.OK, 'Recently viewed fetched', { entries }).send(res);
});

export const clearRecentlyViewed = asyncHandler(async (req, res) => {
  const deleted = await recommendationService.clearRecentlyViewed(req.user);
  return new ApiResponse(HTTP_STATUS.OK, 'Recently viewed cleared', { deleted }).send(res);
});
