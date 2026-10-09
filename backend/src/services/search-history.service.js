import SearchLog from '../models/SearchLog.js';
import logger from '../config/logger.js';

const DEFAULT_LIMIT = 10;

function normalizeQuery(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function userIdOf(user) {
  return user?._id ?? user?.id ?? null;
}

function pickFilters(query = {}) {
  return Object.fromEntries(
    ['category', 'brand', 'minPrice', 'maxPrice', 'rating', 'minDiscount', 'inStock']
      .map((key) => [key, query[key]])
      .filter(([, value]) => value !== undefined),
  );
}

export async function recordRecentSearch({ user, query, mode = 'hybrid', resultCount = 0 }) {
  const userId = userIdOf(user);
  const normalizedQuery = normalizeQuery(query?.q ?? query);
  if (!userId || !normalizedQuery) return;

  try {
    const rawQuery = typeof query === 'string' ? query : query?.q;
    const filters = typeof query === 'object' ? pickFilters(query) : {};

    // Keep one entry per normalized query and move it to the front when searched again.
    await SearchLog.deleteMany({ user: userId, normalizedQuery });
    await SearchLog.create({
      user: userId,
      query: String(rawQuery).trim(),
      normalizedQuery,
      mode,
      resultCount: Number.isFinite(Number(resultCount)) ? Number(resultCount) : 0,
      filters,
    });

    const keep = await SearchLog.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(DEFAULT_LIMIT)
      .select('_id')
      .lean();

    if (keep.length) {
      await SearchLog.deleteMany({ _id: { $in: keep.map((item) => item._id) } });
    }
  } catch (error) {
    // Search history is non-critical. A database failure must never break search.
    logger.warn('Recent search history write failed', { error: error.message });
  }
}

export async function listRecentSearches(user, limit = DEFAULT_LIMIT) {
  const userId = userIdOf(user);
  if (!userId) return [];

  const safeLimit = Math.max(1, Math.min(Number(limit) || DEFAULT_LIMIT, 20));
  const entries = await SearchLog.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  return entries.map((entry) => ({
    id: String(entry._id),
    query: entry.query,
    mode: entry.mode,
    resultCount: entry.resultCount,
    filters: entry.filters ?? {},
    searchedAt: entry.createdAt,
  }));
}

export async function clearRecentSearches(user) {
  const userId = userIdOf(user);
  if (!userId) return 0;
  const result = await SearchLog.deleteMany({ user: userId });
  return result.deletedCount ?? 0;
}
