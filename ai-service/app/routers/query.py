from fastapi import APIRouter

from ..schemas.query_schema import AnalyzeResponse, QueryRequest
from ..services.embedding_service import get_embedding_service
from ..services.query_parser import parse_query

router = APIRouter(prefix="/v1/query", tags=["Query"])


@router.post("/parse")
def parse(payload: QueryRequest):
    parsed = parse_query(
        payload.query,
        payload.vocabulary.model_dump(by_alias=True),
    )
    return {"success": True, "data": parsed}


@router.post("/analyze", response_model=dict)
def analyze(payload: QueryRequest):
    parsed = parse_query(
        payload.query,
        payload.vocabulary.model_dump(by_alias=True),
    )
    service = get_embedding_service()
    vector = service.embed_query(parsed["cleanQuery"])
    data = {
        **parsed,
        "embedding": vector,
        "embeddingVersion": service.settings.embedding_version,
        "embeddingDimensions": service.settings.embedding_dimensions,
    }
    return {"success": True, "data": data}
