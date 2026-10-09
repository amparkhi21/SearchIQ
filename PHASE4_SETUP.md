# SearchIQ Phase 4 - AI Service Setup

This update completes the Phase 4 implementation around the existing Phase 2/3 backend.

## What is included

- Internal FastAPI AI service on port 8000.
- English `sentence-transformers/all-MiniLM-L6-v2` embeddings (384 dimensions).
- Natural-language query parser with price extraction, category/brand matching, soft signals and intent tags.
- Extractive, rating-aware review summarization.
- Node.js AI client with timeout/retry, Redis query-analysis cache and circuit breaker.
- Non-critical AI health reporting.
- Admin-only Node diagnostics in Swagger.
- Docker Compose service definition.
- `npm.cmd run test:ai` integration smoke test.
- Python unit tests for parser, similarity and review summarizer.

## Local commands

From the SearchIQ root:

```powershell
docker compose up -d
```

The first AI image build can take significantly longer than MongoDB/Redis/OpenSearch because it installs ML dependencies and downloads the model during image build.

Then run the Node backend on the host:

```powershell
cd backend
npm.cmd run seed:admin
npm.cmd run seed:catalog
npm.cmd run dev
```

In a second terminal:

```powershell
cd backend
npm.cmd run test:catalog
npm.cmd run test:ai
```

Swagger:

```text
http://localhost:5000/api/docs
```

## Environment

Add these to `backend/.env` only when you want to override the development defaults:

```env
AI_SERVICE_URL=http://localhost:8000
AI_INTERNAL_KEY=dev-only-ai-key-change-me-0123456789abcdef
AI_QUERY_TIMEOUT_MS=3000
AI_EMBED_TIMEOUT_MS=30000
AI_RETRIES=2
AI_CIRCUIT_FAILURE_THRESHOLD=5
AI_CIRCUIT_RESET_MS=30000
```

For production, replace the development internal key with a strong secret.

## Verification note

The repository was statically checked in this environment:
- JavaScript syntax check: all backend JavaScript files passed.
- Python compilation check: all AI-service Python files passed.
- Docker Compose YAML parsed successfully.

The actual Sentence Transformers model load and live HTTP integration must be executed on the developer machine because this environment does not provide the ML runtime/model download or the user's Docker daemon.
