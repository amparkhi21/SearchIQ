from fastapi import APIRouter

from ..services.embedding_service import get_embedding_service

router = APIRouter(tags=["Health"])


@router.get("/health")
def health():
    return {
        "success": True,
        "status": "ok",
        "service": "ai-service",
    }


@router.get("/health/ready")
def readiness():
    service = get_embedding_service()
    service.load()
    return {
        "success": True,
        "status": "ready",
        "model": service.info(),
    }
