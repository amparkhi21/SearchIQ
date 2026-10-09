# Phase 5G — Recommendations, Recently Viewed & Search Analytics

Phase 5G adds recommendation and analytics capabilities on top of the verified Phase 5A–5F search stack.

## Recommendation APIs

- `GET /api/v1/recommendations/similar/:id` — public vector-similarity recommendations for an active product.
- `GET /api/v1/recommendations/for-me?limit=10` — authenticated personalized recommendations seeded from recently viewed products; falls back to popular products when the user has no history.
- `POST /api/v1/recommendations/viewed/:id` — authenticated record/update of a product view.
- `GET /api/v1/recommendations/recently-viewed?limit=10` — authenticated recently viewed products.
- `DELETE /api/v1/recommendations/recently-viewed` — clear recently viewed history.

Recently viewed history is capped at 20 entries per user. Re-viewing a product updates its timestamp instead of creating a duplicate.

## Search analytics

- `GET /api/v1/admin/analytics/search?days=7&limit=10` — admin-only aggregation of authenticated search logs.

The analytics response includes total searches, unique users, zero-result rate, top queries, zero-result queries, search-mode usage and daily search volume. Anonymous searches are not included because the existing `SearchLog` model requires a user reference.

## Verification

With MongoDB, Redis, OpenSearch and the Node API running:

```powershell
npm.cmd run test:recommendations
npm.cmd run test:analytics
```

Then rerun the existing search regressions:

```powershell
npm.cmd run test:search-index
npm.cmd run test:search-bm25
npm.cmd run test:search-semantic
npm.cmd run test:search-hybrid
npm.cmd run test:search-query
npm.cmd run test:search-features
```
