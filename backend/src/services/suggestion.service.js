import { env } from '../config/env.js';
import { getOpenSearchClient } from '../config/opensearch.js';
import { getRedisClient } from '../config/redis.js';
import logger from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { PRODUCT_INDEX } from './indexing.service.js';
import { mongoSuggestions } from './mongo-search.service.js';

const CACHE_PREFIX = 'search:suggest:v1:';

function responseBody(response) {
  return response?.body ?? response;
}

function normalize(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function cacheKey(query, limit) {
  const engine = env.search.mongoOnly ? { engine: 'mongo' } : {};
  return `${CACHE_PREFIX}${Buffer.from(JSON.stringify({ q: normalize(query), limit, ...engine })).toString('base64url')}`;
}

async function readCache(key) {
  try {
    const redis = getRedisClient();
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.warn('Suggestion cache read failed', { error: error.message });
    return null;
  }
}

async function writeCache(key, value) {
  try {
    const ttl = Math.max(1, Math.min(env.search.suggestionCacheTtlSeconds, 300));
    const redis = getRedisClient();
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (error) {
    logger.warn('Suggestion cache write failed', { error: error.message });
  }
}

function addSuggestion(list, seen, item) {
  const normalized = normalize(item.text);
  if (!normalized || seen.has(`${item.type}:${normalized}`)) return;
  seen.add(`${item.type}:${normalized}`);
  list.push(item);
}

export async function getSearchSuggestions({ q, limit = 10 } = {}) {
  const query = String(q ?? '').trim();
  if (!query) throw ApiError.badRequest('Search suggestion query is required');

  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 15));
  const key = cacheKey(query, safeLimit);
  const cached = await readCache(key);
  if (cached) return { ...cached, cached: true };

  if (env.search.mongoOnly) {
    try {
      const payload = { suggestions: await mongoSuggestions(query, safeLimit), cached: false };
      await writeCache(key, payload);
      return payload;
    } catch (error) {
      logger.error('Search suggestions failed', { error: error.message });
      throw ApiError.serviceUnavailable('Search suggestions are unavailable');
    }
  }

  const client = getOpenSearchClient();
  const size = Math.min(20, safeLimit * 2);
  const body = {
    size,
    _source: ['productId', 'name', 'slug', 'brandName', 'brandSlug', 'categoryName', 'categorySlug'],
    query: {
      bool: {
        filter: [{ term: { isActive: true } }],
        should: [
          { match_phrase_prefix: { name: { query, boost: 10 } } },
          { match_bool_prefix: { name: { query, boost: 8 } } },
          { match_bool_prefix: { brandName: { query, boost: 6 } } },
          { match_bool_prefix: { categoryName: { query, boost: 5 } } },
          { match_bool_prefix: { searchableText: { query, boost: 2 } } },
        ],
        minimum_should_match: 1,
      },
    },
    aggs: {
      brands: { terms: { field: 'brandName.keyword', size: Math.min(5, safeLimit) } },
      categories: { terms: { field: 'categoryName.keyword', size: Math.min(5, safeLimit) } },
    },
  };

  try {
    const response = await client.search({ index: PRODUCT_INDEX, body });
    const result = responseBody(response);
    const suggestions = [];
    const seen = new Set();

    for (const bucket of result?.aggregations?.brands?.buckets ?? []) {
      addSuggestion(suggestions, seen, { type: 'brand', text: bucket.key, score: Number(bucket.doc_count) });
    }
    for (const bucket of result?.aggregations?.categories?.buckets ?? []) {
      addSuggestion(suggestions, seen, { type: 'category', text: bucket.key, score: Number(bucket.doc_count) });
    }

    for (const hit of result?.hits?.hits ?? []) {
      const source = hit?._source ?? {};
      addSuggestion(suggestions, seen, {
        type: 'product',
        text: source.name,
        id: source.productId,
        slug: source.slug,
        brand: source.brandName ? { name: source.brandName, slug: source.brandSlug } : undefined,
        category: source.categoryName ? { name: source.categoryName, slug: source.categorySlug } : undefined,
        score: Number(hit?._score ?? 0),
      });
      if (suggestions.length >= safeLimit * 2) break;
    }

    const payload = { suggestions: suggestions.slice(0, safeLimit), cached: false };
    await writeCache(key, payload);
    return payload;
  } catch (error) {
    logger.error('Search suggestions failed', { error: error.message });
    throw ApiError.serviceUnavailable('Search suggestions are unavailable');
  }
}
