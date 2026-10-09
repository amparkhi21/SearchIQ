# SearchIQ Phase 5A — OpenSearch Product Indexing

Phase 5A adds the OpenSearch product-index foundation for later BM25, vector kNN, and hybrid search.

## Reindex the catalog

From `backend`:

```powershell
npm.cmd run search:reindex
```

This upserts the 275 MongoDB products into the configured OpenSearch index and generates 384-dimensional embeddings through the internal AI service.

For a destructive OpenSearch-only rebuild (MongoDB is untouched):

```powershell
npm.cmd run search:reindex -- --recreate
```

## Verify the index

```powershell
npm.cmd run test:search-index
```

MongoDB remains the source of truth. Phase 5A does not yet expose `/search`, BM25, kNN, or hybrid ranking; those are subsequent Phase 5 tasks.
