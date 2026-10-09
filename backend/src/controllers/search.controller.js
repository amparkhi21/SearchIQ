import { HTTP_STATUS } from '../constants.js';
import * as searchService from '../services/search.service.js';
import * as suggestionService from '../services/suggestion.service.js';
import * as searchHistoryService from '../services/search-history.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isAdmin } from '../utils/roles.js';

export const searchProducts = asyncHandler(async (req, res) => {
  const data = await searchService.searchProducts(req.query, {
    admin: isAdmin(req.user),
    requestId: req.id,
  });

  return new ApiResponse(HTTP_STATUS.OK, 'Products searched', {
    results: data.results,
  }, data.meta).send(res);
});

export const unifiedSearchProducts = asyncHandler(async (req, res) => {
  const data = await searchService.unifiedSearchProducts(req.query, {
    admin: isAdmin(req.user),
    requestId: req.id,
  });

  if (req.user) {
    void searchHistoryService.recordRecentSearch({
      user: req.user,
      query: req.query,
      mode: data.mode,
      resultCount: data.meta?.total ?? data.results?.length ?? 0,
    });
  }

  return new ApiResponse(HTTP_STATUS.OK, 'Search completed', {
    results: data.results,
    mode: data.mode,
    query: data.query,
    ...(data.analysis ? { analysis: data.analysis } : {}),
    ...(data.embeddingVersion ? { embeddingVersion: data.embeddingVersion } : {}),
    ...(data.embeddingDimensions ? { embeddingDimensions: data.embeddingDimensions } : {}),
    ...(data.candidateCount !== undefined ? { candidateCount: data.candidateCount } : {}),
    ...(data.weights ? { weights: data.weights } : {}),
    cached: Boolean(data.cached),
  }, data.meta).send(res);
});

export const hybridSearchProductsController = asyncHandler(async (req, res) => {
  const data = await searchService.hybridSearchProducts(req.query, {
    admin: isAdmin(req.user),
    requestId: req.id,
  });

  return new ApiResponse(HTTP_STATUS.OK, 'Hybrid search completed', {
    results: data.results,
    mode: data.mode,
    query: data.query,
    analysis: data.analysis,
    embeddingVersion: data.embeddingVersion,
    embeddingDimensions: data.embeddingDimensions,
    candidateCount: data.candidateCount,
    weights: data.weights,
  }, data.meta).send(res);
});

export const semanticSearchProducts = asyncHandler(async (req, res) => {
  const data = await searchService.semanticSearchProducts(req.query, {
    admin: isAdmin(req.user),
    requestId: req.id,
  });

  return new ApiResponse(HTTP_STATUS.OK, 'Products searched semantically', {
    results: data.results,
    mode: data.mode,
    embeddingVersion: data.embeddingVersion,
    embeddingDimensions: data.embeddingDimensions,
  }, data.meta).send(res);
});


export const searchSuggestions = asyncHandler(async (req, res) => {
  const data = await suggestionService.getSearchSuggestions(req.query);
  return new ApiResponse(HTTP_STATUS.OK, 'Search suggestions fetched', {
    suggestions: data.suggestions,
    cached: Boolean(data.cached),
  }).send(res);
});

export const recentSearches = asyncHandler(async (req, res) => {
  const searches = await searchHistoryService.listRecentSearches(req.user, req.query.limit);
  return new ApiResponse(HTTP_STATUS.OK, 'Recent searches fetched', { searches }).send(res);
});

export const clearRecentSearches = asyncHandler(async (req, res) => {
  const deleted = await searchHistoryService.clearRecentSearches(req.user);
  return new ApiResponse(HTTP_STATUS.OK, 'Recent searches cleared', { deleted }).send(res);
});
