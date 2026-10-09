from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import embed, health, query, reviews
from .services.embedding_service import get_embedding_service

logger = logging.getLogger("searchiq-ai")
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logger.info("Starting %s with model %s", settings.app_name, settings.model_name)
    # Load at startup so readiness reflects actual model availability.
    get_embedding_service().load()
    yield
    logger.info("Stopping %s", settings.app_name)


app = FastAPI(
    title="SearchIQ AI Service",
    version="1.0.0",
    description="Internal AI service for query understanding, embeddings and review summarization.",
    lifespan=lifespan,
)


@app.middleware("http")
async def internal_key_guard(request: Request, call_next):
    # Health endpoints are intentionally public for container probes.
    if request.url.path in {"/health", "/health/ready", "/docs", "/openapi.json", "/redoc"}:
        return await call_next(request)

    provided = request.headers.get("X-Internal-Key")
    if not provided or provided != settings.internal_key:
        return JSONResponse(
            status_code=401,
            content={
                "success": False,
                "message": "Invalid internal service key",
            },
        )

    response = await call_next(request)
    request_id = request.headers.get("X-Request-Id")
    if request_id:
        response.headers["X-Request-Id"] = request_id
    return response


app.include_router(health.router)
app.include_router(query.router)
app.include_router(embed.router)
app.include_router(reviews.router)
