# SearchIQ — Phase 5B: BM25 Keyword Search

Phase 5B adds a dedicated `GET /api/v1/search` endpoint backed by the `searchiq-products-v1` OpenSearch index.

## Features
- BM25 full-text relevance across product name, brand, category, tags, searchable text and description.
- Phrase and prefix boosts for better ranking and partial-word support.
- Category/brand filters (id or slug, comma separated), with one-level child-category expansion.
- Final-price, rating, discount and stock filters.
- Stable pagination with `page` and `limit` (max 100).
- Explicit sorting: `newest`, `oldest`, `price_asc`, `price_desc`, `rating`, `popular`, `discount`, `name_asc`.
- Public searches hide inactive products. Admins can include inactive products with `includeInactive=true`.
- OpenSearch failures return a controlled 503 response.
- Search results include a relevance score.

## Local verification

Make sure MongoDB, Redis, OpenSearch and the Python AI service are healthy, and keep the Node backend running.

```powershell
npm.cmd run search:reindex
npm.cmd run test:search-index
npm.cmd run test:search-bm25
```

The Phase 5A index test should still pass before relying on the BM25 search test.

## Architecture

Browser -> Node `/api/v1/search` -> Search service -> OpenSearch `searchiq-products-v1`

Phase 5B intentionally does not use vector kNN or the Python AI query analyzer. Those are added in the later hybrid-search phase.
