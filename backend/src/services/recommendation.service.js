import mongoose from 'mongoose';
import Product from '../models/Product.js';
import RecentlyViewed from '../models/RecentlyViewed.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { getOpenSearchClient } from '../config/opensearch.js';
import { PRODUCT_INDEX } from './indexing.service.js';
import { toSearchResult } from './search.service.js';
import {
  mongoPopularProducts,
  mongoRecommendations,
  mongoSimilarProducts,
} from './mongo-search.service.js';
import logger from '../config/logger.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const MAX_SEEDS = 5;
const VECTOR_CANDIDATE_MULTIPLIER = 3;
const POPULARITY_WEIGHT = 0.08;

function responseBody(response) {
  return response?.body ?? response;
}

function userIdOf(user) {
  return user?._id ?? user?.id ?? null;
}

function objectId(value) {
  if (!value) return null;
  const stringValue = value.toString();
  return mongoose.isValidObjectId(stringValue) ? stringValue : null;
}

function safeLimit(value) {
  return Math.min(Math.max(Number(value) || DEFAULT_LIMIT, 1), MAX_LIMIT);
}

function normalizePopularity(source) {
  const sold = Math.max(0, Number(source?.soldCount ?? 0));
  const rating = Math.max(0, Number(source?.ratingAvg ?? 0));
  const ratingCount = Math.max(0, Number(source?.ratingCount ?? 0));
  return Math.log1p(sold) + (rating / 5) * 2 + Math.log1p(ratingCount) * 0.1;
}

async function getIndexDocument(productId) {
  const client = getOpenSearchClient();
  const response = await client.get({ index: PRODUCT_INDEX, id: productId, _source: true });
  const body = responseBody(response);
  if (!body?.found || !body?._source) return null;
  return body._source;
}

function activeFilter(excludedIds = []) {
  const filters = [{ term: { isActive: true } }];
  if (excludedIds.length) filters.push({ bool: { must_not: { terms: { productId: excludedIds } } } });
  return filters;
}

function buildKnnQuery(vector, k, filters) {
  return {
    knn: {
      embedding: {
        vector,
        k,
        filter: { bool: { filter: filters } },
      },
    },
  };
}

function extractProductResults(hits) {
  return hits.map((hit) => ({
    ...toSearchResult(hit),
    similarityScore: typeof hit?._score === 'number' ? hit._score : null,
  }));
}

export async function getSimilarProducts(productId, limit = DEFAULT_LIMIT) {
  const id = objectId(productId);
  if (!id) throw ApiError.badRequest('Invalid product id');

  const product = await Product.findById(id).populate([
    { path: 'category', select: 'name slug' },
    { path: 'brand', select: 'name slug logo' },
  ]);
  if (!product || !product.isActive) throw ApiError.notFound('Product not found');

  if (env.search.mongoOnly) return mongoSimilarProducts(product, limit);

  let source;
  try {
    source = await getIndexDocument(id);
  } catch (error) {
    if (error?.statusCode === 404 || error?.body?.statusCode === 404) source = null;
    else throw ApiError.serviceUnavailable('Recommendation index is unavailable');
  }

  if (!Array.isArray(source?.embedding) || source.embedding.length !== env.search.embeddingDimensions) {
    throw ApiError.serviceUnavailable('Product is not indexed for similarity recommendations');
  }

  const client = getOpenSearchClient();
  try {
    const k = Math.min(100, limit + 1 + 10);
    const response = await client.search({
      index: PRODUCT_INDEX,
      body: {
        size: k,
        track_total_hits: false,
        query: buildKnnQuery(source.embedding, k, activeFilter([id])),
        _source: true,
      },
    });
    const hits = responseBody(response)?.hits?.hits ?? [];
    return extractProductResults(hits).slice(0, limit);
  } catch (error) {
    logger.warn('Similar-product search failed', { productId: id, error: error.message });
    throw ApiError.serviceUnavailable('Similar product service is unavailable');
  }
}

export async function recordRecentlyViewed(user, productId) {
  const userId = objectId(userIdOf(user));
  const id = objectId(productId);
  if (!userId) throw ApiError.unauthorized('Authentication required');
  if (!id) throw ApiError.badRequest('Invalid product id');

  const product = await Product.findOne({ _id: id, isActive: true }).select('_id');
  if (!product) throw ApiError.notFound('Product not found');

  await RecentlyViewed.findOneAndUpdate(
    { user: userId, product: id },
    { $set: { viewedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const stale = await RecentlyViewed.find({ user: userId })
    .sort({ viewedAt: -1 })
    .skip(20)
    .select('_id')
    .lean();
  if (stale.length) await RecentlyViewed.deleteMany({ _id: { $in: stale.map((item) => item._id) } });

  return { productId: id, viewedAt: new Date() };
}

export async function listRecentlyViewed(user, limit = DEFAULT_LIMIT) {
  const userId = objectId(userIdOf(user));
  if (!userId) throw ApiError.unauthorized('Authentication required');

  const entries = await RecentlyViewed.find({ user: userId })
    .sort({ viewedAt: -1 })
    .limit(safeLimit(limit))
    .populate({
      path: 'product',
      match: { isActive: true },
      populate: [
        { path: 'category', select: 'name slug' },
        { path: 'brand', select: 'name slug logo' },
      ],
    })
    .lean();

  return entries
    .filter((entry) => entry.product)
    .map((entry) => {
      const product = { ...entry.product, id: String(entry.product._id) };
      delete product._id;
      return {
        product,
        viewedAt: entry.viewedAt,
      };
    });
}

export async function clearRecentlyViewed(user) {
  const userId = objectId(userIdOf(user));
  if (!userId) throw ApiError.unauthorized('Authentication required');
  const result = await RecentlyViewed.deleteMany({ user: userId });
  return result.deletedCount ?? 0;
}

async function fallbackPopular(limit) {
  if (env.search.mongoOnly) return mongoPopularProducts(limit);
  const client = getOpenSearchClient();
  try {
    const response = await client.search({
      index: PRODUCT_INDEX,
      body: {
        size: limit,
        track_total_hits: false,
        query: { bool: { filter: [{ term: { isActive: true } }] } },
        sort: [
          { soldCount: { order: 'desc' } },
          { ratingAvg: { order: 'desc' } },
          { ratingCount: { order: 'desc' } },
          { createdAt: { order: 'desc' } },
          { productId: { order: 'desc' } },
        ],
        _source: true,
      },
    });
    return (responseBody(response)?.hits?.hits ?? []).map((hit) => ({
      ...toSearchResult(hit),
      recommendationScore: Number((normalizePopularity(hit._source) / 20).toFixed(6)),
      reason: 'popular',
    }));
  } catch (error) {
    throw ApiError.serviceUnavailable('Recommendation service is unavailable');
  }
}

export async function getRecommendations(user, limit = DEFAULT_LIMIT) {
  const userId = objectId(userIdOf(user));
  if (!userId) throw ApiError.unauthorized('Authentication required');
  const safe = safeLimit(limit);
  if (env.search.mongoOnly) return mongoRecommendations(userId, safe);

  const recent = await RecentlyViewed.find({ user: userId })
    .sort({ viewedAt: -1 })
    .limit(MAX_SEEDS)
    .select('product viewedAt')
    .lean();

  if (!recent.length) return fallbackPopular(safe);

  const seedIds = recent.map((item) => String(item.product));
  const client = getOpenSearchClient();
  const scoreById = new Map();

  try {
    for (const seedId of seedIds) {
      let seed;
      try {
        seed = await getIndexDocument(seedId);
      } catch (error) {
        if (error?.statusCode === 404 || error?.body?.statusCode === 404) continue;
        throw error;
      }
      if (!Array.isArray(seed?.embedding)) continue;

      const k = Math.min(100, safe * VECTOR_CANDIDATE_MULTIPLIER + 10);
      const response = await client.search({
        index: PRODUCT_INDEX,
        body: {
          size: k,
          track_total_hits: false,
          query: buildKnnQuery(seed.embedding, k, activeFilter(seedIds)),
          _source: true,
        },
      });
      const hits = responseBody(response)?.hits?.hits ?? [];
      hits.forEach((hit, index) => {
        const id = hit?._source?.productId;
        if (!id) return;
        const entry = scoreById.get(id) ?? { source: hit._source, rankScore: 0, bestSimilarity: 0, from: new Set() };
        const rank = index + 1;
        entry.rankScore += 1 / (50 + rank);
        entry.bestSimilarity = Math.max(entry.bestSimilarity, Number(hit?._score ?? 0));
        entry.from.add(seedId);
        scoreById.set(id, entry);
      });
    }
  } catch (error) {
    logger.warn('Personalized recommendation search failed', { userId, error: error.message });
    return fallbackPopular(safe);
  }

  const results = [...scoreById.values()]
    .map((entry) => {
      const popularity = Math.min(1, normalizePopularity(entry.source) / 20);
      const recommendationScore = entry.rankScore + popularity * POPULARITY_WEIGHT;
      return {
        ...toSearchResult({ _source: entry.source, _score: entry.bestSimilarity }),
        similarityScore: entry.bestSimilarity,
        recommendationScore,
        matchedViewedProducts: entry.from.size,
        reason: entry.from.size > 1 ? 'similar-to-recent-views' : 'similar-to-recent-view',
      };
    })
    .sort((a, b) => {
      if (b.recommendationScore !== a.recommendationScore) return b.recommendationScore - a.recommendationScore;
      return Number(b.ratingAvg ?? 0) - Number(a.ratingAvg ?? 0);
    })
    .slice(0, safe);

  if (results.length) return results;
  return fallbackPopular(safe);
}
