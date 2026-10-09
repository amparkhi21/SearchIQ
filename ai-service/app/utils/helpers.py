import re
from typing import Iterable


def normalize_text(text: str) -> str:
    text = (text or "").replace("\u00a0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def clean_tokens(text: str) -> list[str]:
    return [token for token in re.findall(r"[a-z0-9]+", text.lower()) if token]


def unique_preserve(values: Iterable[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        key = value.strip().lower()
        if key and key not in seen:
            seen.add(key)
            result.append(value.strip())
    return result
