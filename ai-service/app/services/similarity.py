from __future__ import annotations

import math


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("Vectors must have the same dimension")
    dot = sum(x * y for x, y in zip(a, b))
    a_norm = math.sqrt(sum(x * x for x in a))
    b_norm = math.sqrt(sum(y * y for y in b))
    if not a_norm or not b_norm:
        return 0.0
    return dot / (a_norm * b_norm)
