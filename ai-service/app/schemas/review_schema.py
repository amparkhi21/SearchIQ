from pydantic import BaseModel, Field


class ReviewItem(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    rating: float = Field(ge=1, le=5)


class ReviewSummaryRequest(BaseModel):
    reviews: list[ReviewItem] = Field(min_length=1, max_length=500)
