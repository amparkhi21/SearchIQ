from pydantic import BaseModel, ConfigDict, Field


class Vocabulary(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    categories: list[str] = Field(default_factory=list)
    brands: list[str] = Field(default_factory=list)
    colors: list[str] = Field(default_factory=list)
    use_cases: list[str] = Field(default_factory=list, alias="useCases")
    genders: list[str] = Field(default_factory=list)


class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    vocabulary: Vocabulary = Field(default_factory=Vocabulary)


class ParsedQuery(BaseModel):
    clean_query: str = Field(alias="cleanQuery")
    hard_filters: dict = Field(alias="hardFilters")
    soft_signals: dict = Field(alias="softSignals")
    intent_tags: list[str] = Field(alias="intentTags")
    confidence: dict[str, float]

    model_config = ConfigDict(populate_by_name=True)


class AnalyzeResponse(ParsedQuery):
    embedding: list[float]
    embedding_version: str = Field(alias="embeddingVersion")
    embedding_dimensions: int = Field(alias="embeddingDimensions")

    model_config = ConfigDict(populate_by_name=True)
