from fastapi import APIRouter

from ..schemas.review_schema import ReviewSummaryRequest
from ..services.review_summarizer import summarize_reviews

router = APIRouter(prefix="/v1/reviews", tags=["Reviews"])


@router.post("/summarize")
def summarize(payload: ReviewSummaryRequest):
    result = summarize_reviews([item.model_dump() for item in payload.reviews])
    return {"success": True, "data": result}
