from __future__ import annotations

from functools import lru_cache
from typing import Iterable

from sentence_transformers import SentenceTransformer

from ..config import get_settings
from .query_parser import build_embedding_text


class EmbeddingService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._model: SentenceTransformer | None = None

    def load(self) -> None:
        if self._model is None:
            self._model = SentenceTransformer(
                self.settings.model_name,
                device="cpu",
            )
            actual_dimension = self._model.get_sentence_embedding_dimension()
            if actual_dimension != self.settings.embedding_dimensions:
                raise RuntimeError(
                    f"Model dimension mismatch: expected {self.settings.embedding_dimensions}, "
                    f"got {actual_dimension}"
                )

    @property
    def loaded(self) -> bool:
        return self._model is not None

    def info(self) -> dict:
        return {
            "model": self.settings.model_name,
            "dimensions": self.settings.embedding_dimensions,
            "embeddingVersion": self.settings.embedding_version,
            "loaded": self.loaded,
        }

    def embed_texts(self, texts: Iterable[str]) -> list[list[float]]:
        self.load()
        items = [str(text or "")[: self.settings.max_text_length] for text in texts]
        if not items:
            return []
        embeddings = self._model.encode(
            items,
            batch_size=min(32, max(1, len(items))),
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        return embeddings.astype("float32").tolist()

    def embed_query(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]

    def embed_products(self, products: list[dict]) -> list[dict]:
        texts = [build_embedding_text(product) for product in products]
        vectors = self.embed_texts(texts)
        return [
            {
                "index": index,
                "text": texts[index],
                "embedding": vectors[index],
            }
            for index in range(len(products))
        ]


@lru_cache(maxsize=1)
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()
