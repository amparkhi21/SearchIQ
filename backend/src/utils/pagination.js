import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants.js';

/** Converts validated query params into page, limit and the Mongo `skip` value. */
export function getPagination({ page, limit } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(limit) || DEFAULT_PAGE_SIZE));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export function buildPaginationMeta({ total, page, limit }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
