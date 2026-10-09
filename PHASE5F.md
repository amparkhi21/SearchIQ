# Phase 5F — Search Suggestions & Recent Search History

Phase 5F adds two search-experience capabilities on top of the verified Phase 5A–5E stack:

- `GET /api/v1/search/suggestions?q=...&limit=...` — public autocomplete suggestions from the OpenSearch product index, covering products, brands and categories. Results are briefly cached in Redis.
- `GET /api/v1/search/recent?limit=...` — authenticated user's recent searches.
- `DELETE /api/v1/search/recent` — clears the authenticated user's recent search history.

Authenticated unified searches (`GET /api/v1/search/query`) are recorded automatically. History is best-effort and never allowed to break a successful search response.

## Verification

Run with the Node API, MongoDB, Redis and OpenSearch running:

```powershell
npm.cmd run test:search-features
```

Also run the regression smoke tests:

```powershell
npm.cmd run test:search-index
npm.cmd run test:search-bm25
npm.cmd run test:search-semantic
npm.cmd run test:search-hybrid
npm.cmd run test:search-query
```

## Configuration

```env
SEARCH_SUGGESTION_CACHE_TTL_SECONDS=30
```

The value is bounded to 300 seconds by the backend configuration.
