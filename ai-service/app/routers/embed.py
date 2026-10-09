from fastapi import APIRouter

from ..schemas.embed_schema import ProductEmbeddingRequest, QueryEmbeddingRequest
from ..services.embedding_service import get_embedding_service

router = APIRouter(prefix="/v1/embed", tags=["Embeddings"])


@router.get("/info")
def info():
    return {"success": True, "data": get_embedding_service().info()}


@router.post("/query")
def embed_query(payload: QueryEmbeddingRequest):
    vector = get_embedding_service().embed_query(payload.text)
    service = get_embedding_service()
    return {
        "success": True,
        "data": {
            "embedding": vector,
            "dimensions": service.settings.embedding_dimensions,
            "embeddingVersion": service.settings.embedding_version,
        },
    }


@router.post("/products")
def embed_products(payload: ProductEmbeddingRequest):
    service = get_embedding_service()
    products = [item.model_dump() for item in payload.products]
    result = service.embed_products(products)
    return {
        "success": True,
        "data": {
            "items": result,
            "dimensions": service.settings.embedding_dimensions,
            "embeddingVersion": service.settings.embedding_version,
        },
    }
