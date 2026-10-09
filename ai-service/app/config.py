import os
from dataclasses import dataclass
from functools import lru_cache


def _bool(name: str, default: bool) -> bool:
    value = os.getenv(name, str(default)).strip().lower()
    return value in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("AI_APP_NAME", "SearchIQ AI Service")
    environment: str = os.getenv("NODE_ENV", os.getenv("AI_ENV", "development"))
    host: str = os.getenv("AI_HOST", "0.0.0.0")
    port: int = int(os.getenv("AI_PORT", "8000"))
    internal_key: str = os.getenv("AI_INTERNAL_KEY", "dev-only-ai-key-change-me-0123456789abcdef")
    model_name: str = os.getenv("MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
    embedding_version: str = os.getenv("EMBEDDING_VERSION", "minilm-v1")
    embedding_dimensions: int = int(os.getenv("EMBEDDING_DIMENSIONS", "384"))
    max_product_batch: int = int(os.getenv("MAX_PRODUCT_BATCH", "64"))
    max_text_length: int = int(os.getenv("MAX_TEXT_LENGTH", "4000"))
    allow_cors: bool = _bool("AI_ALLOW_CORS", False)

    @property
    def production(self) -> bool:
        return self.environment == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
