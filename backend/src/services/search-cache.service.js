import { env } from '../config/env.js';
import { getRedisClient } from '../config/redis.js';
import logger from '../config/logger.js';

const PREFIX = 'search:result:v1:';

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, normalize(item)]),
    );
  }
  if (typeof value === 'string') return value.trim();
  return value;
}

export function buildSearchCacheKey(query, { mode = 'hybrid', admin = false } = {}) {
  const payload = normalize({
    mode,
    admin: Boolean(admin),
    query,
    embeddingVersion: env.search.embeddingVersion,
    textVersion: env.search.textVersion,
  });
  return `${PREFIX}${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
}

export async function getCachedSearchResult(key) {
  try {
    const redis = getRedisClient();
    const raw = await redis.get(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (error) {
    logger.warn('Search cache read failed', { error: error.message });
    return null;
  }
}

export async function setCachedSearchResult(key, value) {
  if (!env.search.cacheTtlSeconds) return;
  try {
    const redis = getRedisClient();
    await redis.set(key, JSON.stringify(value), 'EX', env.search.cacheTtlSeconds);
  } catch (error) {
    logger.warn('Search cache write failed', { error: error.message });
  }
}
