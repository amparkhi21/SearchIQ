import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { getRedisClient } from '../config/redis.js';

const CACHE_PREFIX = 'ai:query:';
const CACHE_TTL_SECONDS = 60 * 60;

let circuit = {
  failures: 0,
  openedAt: 0,
};

function isCircuitOpen() {
  if (!circuit.openedAt) return false;
  if (Date.now() - circuit.openedAt >= env.ai.circuitResetMs) {
    circuit = { failures: 0, openedAt: 0 };
    return false;
  }
  return true;
}

function recordSuccess() {
  circuit = { failures: 0, openedAt: 0 };
}

function recordFailure() {
  circuit.failures += 1;
  if (circuit.failures >= env.ai.circuitFailureThreshold) {
    circuit.openedAt = Date.now();
    logger.warn('AI circuit breaker opened', { failures: circuit.failures });
  }
}

function requestId(headers = {}) {
  return headers['x-request-id'] || `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function fetchWithTimeout(path, options = {}, timeoutMs = env.ai.queryTimeoutMs, retryable = true) {
  if (isCircuitOpen()) {
    throw new Error('AI service circuit breaker is open');
  }

  const attempts = retryable ? env.ai.retries + 1 : 1;
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${env.ai.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': env.ai.internalKey,
          'X-Request-Id': requestId(options.headers),
          ...(options.headers ?? {}),
        },
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(body?.message || `AI service returned ${response.status}`);
        error.statusCode = response.status;
        throw error;
      }

      recordSuccess();
      return body;
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        const jitter = 75 + Math.floor(Math.random() * 125);
        await new Promise((resolve) => setTimeout(resolve, jitter * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  recordFailure();
  throw lastError ?? new Error('AI service request failed');
}

async function cachedQuery(cacheKey, producer) {
  const redis = getRedisClient();
  const cacheKeyValue = `${CACHE_PREFIX}${cacheKey}`;

  try {
    const cached = await redis.get(cacheKeyValue);
    if (cached) return JSON.parse(cached);
  } catch (error) {
    logger.warn('AI query cache read failed', { error: error.message });
  }

  const result = await producer();

  try {
    await redis.set(cacheKeyValue, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
  } catch (error) {
    logger.warn('AI query cache write failed', { error: error.message });
  }
  return result;
}

function aiUnavailable(error) {
  if (error?.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return error;
  }
  return ApiError.serviceUnavailable('AI service is unavailable');
}

export async function analyzeQuery({ query, vocabulary = {}, requestId: traceId }) {
  const normalizedVocabulary = {
    categories: [...(vocabulary.categories ?? [])].sort(),
    brands: [...(vocabulary.brands ?? [])].sort(),
    colors: [...(vocabulary.colors ?? [])].sort(),
    useCases: [...(vocabulary.useCases ?? [])].sort(),
    genders: [...(vocabulary.genders ?? [])].sort(),
  };
  const keyPayload = JSON.stringify({ query: query.trim().toLowerCase(), vocabulary: normalizedVocabulary });
  const cacheKey = Buffer.from(keyPayload).toString('base64url');

  return cachedQuery(cacheKey, async () => {
    const response = await fetchWithTimeout(
      '/v1/query/analyze',
      {
        method: 'POST',
        headers: { 'X-Request-Id': traceId },
        body: JSON.stringify({ query, vocabulary: normalizedVocabulary }),
      },
      env.ai.queryTimeoutMs,
      true,
    );
    return response.data;
  }).catch((error) => {
    throw aiUnavailable(error);
  });
}

export async function parseQuery({ query, vocabulary = {}, requestId: traceId }) {
  try {
    const response = await fetchWithTimeout(
      '/v1/query/parse',
      {
        method: 'POST',
        headers: { 'X-Request-Id': traceId },
        body: JSON.stringify({ query, vocabulary }),
      },
      env.ai.queryTimeoutMs,
      true,
    );
    return response.data;
  } catch (error) {
    throw aiUnavailable(error);
  }
}

export async function embedQuery(text, traceId) {
  try {
    const response = await fetchWithTimeout(
      '/v1/embed/query',
      {
        method: 'POST',
        headers: { 'X-Request-Id': traceId },
        body: JSON.stringify({ text }),
      },
      env.ai.embedTimeoutMs,
      true,
    );
    return response.data;
  } catch (error) {
    throw aiUnavailable(error);
  }
}

export async function embedProducts(products, traceId) {
  try {
    const response = await fetchWithTimeout(
      '/v1/embed/products',
      {
        method: 'POST',
        headers: { 'X-Request-Id': traceId },
        body: JSON.stringify({ products }),
      },
      env.ai.embedTimeoutMs,
      true,
    );
    return response.data;
  } catch (error) {
    throw aiUnavailable(error);
  }
}

export async function getModelInfo(traceId) {
  try {
    const response = await fetchWithTimeout(
      '/v1/embed/info',
      {
        method: 'GET',
        headers: { 'X-Request-Id': traceId },
      },
      env.ai.queryTimeoutMs,
      true,
    );
    return response.data;
  } catch (error) {
    throw aiUnavailable(error);
  }
}

export async function summarizeReviews(reviews, traceId) {
  try {
    const response = await fetchWithTimeout(
      '/v1/reviews/summarize',
      {
        method: 'POST',
        headers: { 'X-Request-Id': traceId },
        body: JSON.stringify({ reviews }),
      },
      env.ai.queryTimeoutMs,
      true,
    );
    return response.data;
  } catch (error) {
    throw aiUnavailable(error);
  }
}

export async function healthCheck(traceId) {
  const response = await fetchWithTimeout(
    '/health/ready',
    {
      method: 'GET',
      headers: { 'X-Request-Id': traceId },
    },
    env.ai.queryTimeoutMs,
    false,
  );
  return response;
}

export function aiStatus() {
  return {
    circuitOpen: isCircuitOpen(),
    failures: circuit.failures,
    openedAt: circuit.openedAt || null,
    baseUrl: env.isProduction ? '[configured]' : env.ai.baseUrl,
  };
}
