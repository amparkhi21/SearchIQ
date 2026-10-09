# Phase 5C — Semantic Vector Search

Implemented on top of the existing `searchiq-products-v1` OpenSearch index.

## Endpoint

`GET /api/v1/search/semantic?q=...`

The Node API embeds the query through the internal Python AI service (`all-MiniLM-L6-v2`, 384 dimensions), then performs OpenSearch kNN search over the product `embedding` field. MongoDB remains the source of truth.

## Supported filters

- category
- brand
- minPrice / maxPrice
- rating
- minDiscount
- inStock
- includeInactive for admins
- page / limit

## Result metadata

Results include `semanticScore`, `embeddingVersion`, `embeddingDimensions`, and exact pagination metadata based on the filtered OpenSearch document count.

## Configuration

`SEARCH_VECTOR_K` controls the default kNN candidate size (default `100`). It is capped at 1000 and automatically raised for deeper pages.

## Verification

Run the existing Phase 5A and 5B tests first, then the semantic smoke test:

```powershell
npm.cmd run test:search-index
npm.cmd run test:search-bm25
npm.cmd run test:search-semantic
```

This phase does not implement BM25 + vector hybrid ranking yet.
