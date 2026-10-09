import { api, unwrap, unwrapWithMeta } from './axios';

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/**
 * Unified search (BM25 + semantic + AI query analysis).
 * `sort=relevance` is the backend default but NOT a valid enum value, so it is never sent.
 * → { results, mode, query, analysis, cached, meta }
 */
export const search = async (params = {}) => {
  const p = clean(params);
  if (p.sort === 'relevance') delete p.sort;
  return unwrapWithMeta(await api.get('/search/query', { params: p }));
};
/** → { suggestions: [{ type: 'brand'|'category'|'product', text, id?, slug?, brand?, category? }] } */
export const suggestions = async (params = {}, config = {}) => unwrap(await api.get('/search/suggestions', { params: clean(params), ...config }));
/** → { searches: [{ query, mode, ..., searchedAt }] } (auth required) */
export const recentSearches = async (params = {}) => unwrap(await api.get('/search/recent', { params: clean(params) }));
export const clearRecentSearches = async () => unwrap(await api.delete('/search/recent'));
