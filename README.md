# SearchIQ

AI-powered full-stack e-commerce/search platform.

## Current backend phases

- Phase 2: Authentication & User Management — verified
- Phase 3: Product Catalog — verified with 51/51 live smoke checks
- Phase 4: Python AI service — implemented; run the local integration test after building the AI container

## Local development

### Start services

```powershell
docker compose up -d
```

The AI service is exposed at `http://localhost:8000` for local development. Its public API is protected with the `X-Internal-Key` header; the browser should use the Node API only.

### Backend on the host

```powershell
cd backend
npm.cmd run seed:admin
npm.cmd run seed:catalog
npm.cmd run dev
```

To replace the demo product photos with unique Unsplash photos, add your key to `backend/.env` as `UNSPLASH_ACCESS_KEY=...` (the legacy `ACCESS_KEY` name is also accepted), then run these from `backend`:

```powershell
npm.cmd run seed:images:unsplash
npm.cmd run search:reindex -- --recreate
```

The image sync uses one Unsplash search request per demo product type and saves the selected photo URLs and attribution in MongoDB. Reindexing refreshes search results with the new images. The sync requires the demo catalog to exist and consumes Unsplash API requests.

### Verify Phase 3

```powershell
npm.cmd run test:catalog
```

### Verify Phase 4

In a second terminal:

```powershell
cd backend
npm.cmd run test:ai
```

Swagger:

`http://localhost:5000/api/docs`

The admin-only AI diagnostic endpoints appear under **AI**.

## AI service

The service uses `sentence-transformers/all-MiniLM-L6-v2` and returns 384-dimensional normalized embeddings.

Main internal endpoints:

- `GET /health`
- `GET /health/ready`
- `POST /v1/query/parse`
- `POST /v1/query/analyze`
- `POST /v1/embed/query`
- `POST /v1/embed/products`
- `GET /v1/embed/info`
- `POST /v1/reviews/summarize`

The Node backend remains the public API and talks to the Python service over internal HTTP/JSON.

> Development note: `AI_INTERNAL_KEY` and JWT/admin credentials in local `.env` files are development-only. Never commit `.env` files or production secrets.

## Phase 6A – Shopping Core

Cart, wishlist, checkout/orders, verified-purchase reviews, notifications, and admin order management are implemented in the backend. See `PHASE6A.md` and run `npm.cmd run test:commerce`.
