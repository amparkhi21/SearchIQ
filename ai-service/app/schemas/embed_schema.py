from pydantic import BaseModel, Field


class ProductEmbeddingItem(BaseModel):
    id: str | None = None
    name: str
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    category: str | dict | None = None
    brand: str | dict | None = None
    attributes: dict = Field(default_factory=dict)


class ProductEmbeddingRequest(BaseModel):
    products: list[ProductEmbeddingItem] = Field(min_length=1, max_length=64)


class QueryEmbeddingRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
