# Phase 5E — Unified Search API + Redis Result Caching

Phase 5E adds a production-facing search entry point without removing the earlier BM25, semantic or hybrid endpoints.

## Unified endpoint

`GET /api/v1/search/query`

Modes:
- `hybrid` (default)
- `bm25`
- `semantic`

Examples:

```text
GET /api/v1/search/query?q=comfortable%20black%20shoes%20for%20college%20under%202500
GET /api/v1/search/query?q=running%20shoes&mode=bm25
GET /api/v1/search/query?q=comfortable%20footwear&mode=semantic
```

The existing `/search`, `/search/hybrid` and `/search/semantic` endpoints remain available for backwards compatibility and regression testing.

## Redis result cache

Identical unified-search requests are cached briefly in Redis. The cache key includes mode, filters, pagination, admin visibility and search/embedding versions. Cache failures are non-fatal and search continues normally.

Configure with:

```text
SEARCH_CACHE_TTL_SECONDS=60
```

Set it to `0` to disable result caching.

## Test

```powershell
npm.cmd run test:search-query
```
