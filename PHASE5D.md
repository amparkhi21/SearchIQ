# Phase 5D — Hybrid BM25 + Vector Search

Phase 5D combines the Phase 5B keyword ranking and Phase 5C semantic vector ranking into a single SearchIQ endpoint.

## Endpoint

`GET /api/v1/search/hybrid`

The browser talks only to the Node API. Node asks the internal Python AI service to analyze the query and generate a 384-dimensional embedding, then executes:

1. BM25 keyword search in OpenSearch.
2. Vector kNN search in OpenSearch.
3. Weighted Reciprocal Rank Fusion (RRF) of both ranked lists.

## Query understanding

The AI parser splits signals into:

- **Hard filters:** category, brand, price bounds and availability.
- **Soft signals:** color, use case and intent terms. These influence BM25 boosting but do not become hard filters.

Explicit API filter parameters take precedence over AI-derived hard filters where both exist.

## Default fusion configuration

- BM25 weight: `0.55`
- Vector weight: `0.45`
- RRF constant: `60`
- Candidate pool: `100`

All are configurable through the `SEARCH_HYBRID_*` variables in the backend environment.

## Test

Run:

```powershell
npm.cmd run test:search-hybrid
```

Keep the Phase 5A/5B/5C regression tests available and passing as separate checkpoints.
