from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable

from rapidfuzz import fuzz, process

from ..utils.helpers import normalize_text, unique_preserve


FILLERS = {
    "show", "find", "get", "give", "want", "need", "looking", "look", "for",
    "me", "some", "please", "buy", "purchase", "search", "products", "product",
    "best", "good", "the", "with", "under", "below", "less", "than", "upto",
    "up", "to", "around", "within", "range", "between", "and", "available",
    "in", "stock", "having", "that", "which", "are", "is", "a", "an",
}

INTENT_PATTERNS = {
    "comfort": ("comfortable", "comfort", "cushioned", "soft", "supportive"),
    "budget": ("cheap", "affordable", "budget", "value"),
    "premium": ("premium", "luxury", "high-end", "flagship"),
    "durable": ("durable", "rugged", "long-lasting", "tough"),
    "casual": ("casual", "everyday"),
    "formal": ("formal", "office", "professional"),
    "lightweight": ("lightweight", "light"),
    "wireless": ("wireless", "bluetooth"),
    "fast": ("fast", "quick", "high speed"),
}

DEFAULT_COLORS = [
    "black", "white", "blue", "red", "green", "yellow", "pink", "purple",
    "grey", "gray", "orange", "brown", "beige", "navy", "maroon", "gold",
    "silver", "cream", "multicolor", "transparent", "teal",
]

DEFAULT_USE_CASES = [
    "running", "walking", "gym", "college", "office", "travel", "gaming",
    "work", "study", "sports", "fitness", "hiking", "party", "casual",
    "formal", "daily", "home", "kitchen", "outdoor", "school",
]

DEFAULT_GENDERS = ["men", "women", "unisex", "kids", "boy", "girl", "male", "female"]

CATEGORY_ALIASES = {
    "shoes": "Footwear",
    "shoe": "Footwear",
    "sneakers": "Footwear",
    "sneaker": "Footwear",
    "footwear": "Footwear",
    "tops": "Clothing",
    "clothes": "Clothing",
    "apparel": "Clothing",
    "phones": "Electronics",
    "phone": "Electronics",
    "mobiles": "Electronics",
    "mobile": "Electronics",
    "laptops": "Electronics",
    "beauty": "Beauty",
    "cosmetics": "Beauty",
    "grocery": "Grocery",
    "groceries": "Grocery",
    "food": "Grocery",
    "kitchen": "Home & Kitchen",
    "home": "Home & Kitchen",
    "sports": "Sports & Fitness",
    "fitness": "Sports & Fitness",
    "stationery": "Stationery & Office",
    "office supplies": "Stationery & Office",
    "toys": "Toys & Games",
    "games": "Toys & Games",
    "bags": "Bags & Luggage",
    "luggage": "Bags & Luggage",
}

BRAND_ALIASES = {
    "adidas": ["adidas", "addidas", "adiddas"],
    "u.s. polo assn.": ["u.s. polo", "us polo", "u s polo", "polo assn", "u.s. polo assn"],
    "nike": ["nike", "nikey"],
}


@dataclass
class Vocabulary:
    categories: list[str] = field(default_factory=list)
    brands: list[str] = field(default_factory=list)
    colors: list[str] = field(default_factory=lambda: list(DEFAULT_COLORS))
    use_cases: list[str] = field(default_factory=lambda: list(DEFAULT_USE_CASES))
    genders: list[str] = field(default_factory=lambda: list(DEFAULT_GENDERS))

    @classmethod
    def from_payload(cls, payload: dict | None) -> "Vocabulary":
        payload = payload or {}
        return cls(
            categories=unique_preserve(payload.get("categories", [])),
            brands=unique_preserve(payload.get("brands", [])),
            colors=unique_preserve([*DEFAULT_COLORS, *payload.get("colors", [])]),
            use_cases=unique_preserve([*DEFAULT_USE_CASES, *payload.get("useCases", [])]),
            genders=unique_preserve([*DEFAULT_GENDERS, *payload.get("genders", [])]),
        )


def _parse_number(value: str) -> float:
    value = value.lower().replace(",", "").strip()
    multipliers = {"k": 1_000, "lakh": 100_000, "lac": 100_000, "m": 1_000_000}
    for suffix, multiplier in multipliers.items():
        if value.endswith(suffix):
            return float(value[:-len(suffix)]) * multiplier
    return float(value)


def _is_dimension_context(text: str, start: int, end: int) -> bool:
    window = text[max(0, start - 10): min(len(text), end + 15)].lower()
    return bool(re.search(r"\b\d+(?:\.\d+)?\s*(?:gb|tb|mb|inch|inches|cm|mm|kg|g|ml|l|hz|mp|mah)\b", window))


def extract_price(text: str) -> tuple[float | None, float | None, str]:
    original = text
    normalized = normalize_text(text.lower().replace("₹", " rs "))

    # Between/range expressions.
    range_patterns = [
        r"(?:between|from)\s+(rs\s*)?([0-9]+(?:\.[0-9]+)?(?:\s*(?:k|lakh|lac|m))?)\s+(?:and|to|-)\s*(?:rs\s*)?([0-9]+(?:\.[0-9]+)?(?:\s*(?:k|lakh|lac|m))?)",
        r"(?:rs\s*)?([0-9]+(?:\.[0-9]+)?(?:\s*(?:k|lakh|lac|m))?)\s*(?:-|to)\s*(?:rs\s*)?([0-9]+(?:\.[0-9]+)?(?:\s*(?:k|lakh|lac|m))?)",
    ]
    for pattern in range_patterns:
        match = re.search(pattern, normalized, re.I)
        if match:
            low, high = _parse_number(match.group(1)), _parse_number(match.group(2))
            return low, high, original[match.start():match.end()]

    upper = re.search(
        r"(?:under|below|less than|upto|up to|max(?:imum)?|within)\s*(?:rs\s*)?([0-9]+(?:\.[0-9]+)?(?:\s*(?:k|lakh|lac|m))?)",
        normalized, re.I,
    )
    if upper:
        return None, _parse_number(upper.group(1)), original[upper.start():upper.end()]

    lower = re.search(
        r"(?:above|over|more than|min(?:imum)?)\s*(?:rs\s*)?([0-9]+(?:\.[0-9]+)?(?:\s*(?:k|lakh|lac|m))?)",
        normalized, re.I,
    )
    if lower:
        return _parse_number(lower.group(1)), None, original[lower.start():lower.end()]

    # Currency-prefixed or explicitly price-like standalone values.
    for match in re.finditer(r"(?:rs\s*)?([0-9]+(?:\.[0-9]+)?(?:\s*(?:k|lakh|lac|m))?)", normalized, re.I):
        if _is_dimension_context(normalized, match.start(), match.end()):
            continue
        value = _parse_number(match.group(1))
        if value >= 100:
            return value, None, original[match.start():match.end()]
    return None, None, ""


def _match_term(term: str, choices: Iterable[str], aliases: dict[str, list[str]] | None = None):
    term = term.strip().lower()
    if not term:
        return None, 0.0
    aliases = aliases or {}
    for canonical, values in aliases.items():
        if term in [v.lower() for v in values]:
            return canonical, 100.0
    result = process.extractOne(term, list(choices), scorer=fuzz.token_set_ratio)
    if not result:
        return None, 0.0
    match, score, _ = result
    return match, float(score)


def _phrase_present(text: str, phrase: str) -> bool:
    return bool(re.search(rf"\b{re.escape(phrase.lower())}\b", text.lower()))


def _find_from_lexicon(text: str, lexicon: list[str], aliases=None, threshold=88, max_results=2):
    found: list[tuple[str, float, str]] = []
    text_lower = text.lower()
    ordered = sorted(set(lexicon), key=len, reverse=True)
    for phrase in ordered:
        if _phrase_present(text_lower, phrase):
            found.append((phrase, 100.0, phrase))
            if len(found) >= max_results:
                break
    if found:
        return found

    # Fuzzy against individual query terms only.
    tokens = re.findall(r"[a-z0-9.'-]+", text_lower)
    for token in tokens:
        match, score = _match_term(token, lexicon, aliases)
        if match and score >= threshold:
            found.append((match, score, token))
            if len(found) >= max_results:
                break
    return found


def parse_query(text: str, vocabulary_payload: dict | None = None) -> dict:
    query = normalize_text(text)
    lowered = query.lower()
    vocab = Vocabulary.from_payload(vocabulary_payload)

    min_price, max_price, price_span = extract_price(query)

    categories = []
    for term in vocab.categories:
        if _phrase_present(lowered, term):
            categories.append((term, 100.0))
    for alias, canonical in CATEGORY_ALIASES.items():
        if _phrase_present(lowered, alias) and canonical not in [c[0] for c in categories]:
            categories.append((canonical, 98.0))

    brands = []
    for canonical, aliases in BRAND_ALIASES.items():
        if any(_phrase_present(lowered, alias) for alias in aliases):
            brands.append((canonical, 98.0))

    if vocab.brands:
        fuzzy_brands = _find_from_lexicon(lowered, vocab.brands, BRAND_ALIASES, 86, 1)
        for match, score, _ in fuzzy_brands:
            if match.lower() not in [b[0].lower() for b in brands]:
                brands.append((match, score))

    colors = _find_from_lexicon(lowered, vocab.colors, threshold=90, max_results=2)
    genders = _find_from_lexicon(lowered, vocab.genders, threshold=92, max_results=1)

    # "for men/women" should be recognized as soft only.
    use_cases = _find_from_lexicon(lowered, vocab.use_cases, threshold=90, max_results=3)

    intents = []
    for intent, terms in INTENT_PATTERNS.items():
        if any(_phrase_present(lowered, term) for term in terms):
            intents.append(intent)

    clean = lowered
    if price_span:
        clean = clean.replace(price_span.lower(), " ")
    for canonical, _score in categories + brands + [(c, s) for c, s, _ in colors] + [(g, s) for g, s, _ in genders] + [(u, s) for u, s, _ in use_cases]:
        clean = re.sub(rf"\b{re.escape(canonical.lower())}\b", " ", clean)
    for intent in intents:
        for term in INTENT_PATTERNS[intent]:
            clean = re.sub(rf"\b{re.escape(term)}\b", " ", clean)
    clean_tokens = []
    for token in re.findall(r"[a-z0-9]+", clean):
        if token not in FILLERS:
            clean_tokens.append(token)
    clean_query = " ".join(clean_tokens).strip()
    if not clean_query:
        clean_query = query.lower()

    hard = {}
    if categories:
        hard["category"] = [categories[0][0]]
    if brands:
        hard["brand"] = [brands[0][0]]
    if min_price is not None:
        hard["minPrice"] = round(min_price, 2)
    if max_price is not None:
        hard["maxPrice"] = round(max_price, 2)
    if re.search(r"\b(in\s*stock|available)\b", lowered):
        hard["inStock"] = True

    confidence = {
        "category": round((categories[0][1] / 100), 2) if categories else 0.0,
        "brand": round((brands[0][1] / 100), 2) if brands else 0.0,
        "color": round((colors[0][1] / 100), 2) if colors else 0.0,
        "gender": round((genders[0][1] / 100), 2) if genders else 0.0,
        "useCase": round((use_cases[0][1] / 100), 2) if use_cases else 0.0,
    }

    return {
        "cleanQuery": clean_query,
        "hardFilters": hard,
        "softSignals": {
            "colors": [c for c, _score, _matched in colors],
            "genders": [g for g, _score, _matched in genders],
            "useCases": [u for u, _score, _matched in use_cases],
        },
        "intentTags": unique_preserve(intents),
        "confidence": confidence,
    }


def build_embedding_text(product: dict) -> str:
    attrs = product.get("attributes") or {}
    category = product.get("category")
    brand = product.get("brand")
    category_name = category.get("name") if isinstance(category, dict) else category or ""
    brand_name = brand.get("name") if isinstance(brand, dict) else brand or ""
    pieces = [
        product.get("name", ""),
        f"Brand: {brand_name}" if brand_name else "",
        f"Category: {category_name}" if category_name else "",
        f"Color: {attrs.get('color')}" if attrs.get("color") else "",
        f"For: {attrs.get('gender')}" if attrs.get('gender') else "",
        f"Use: {attrs.get('useCase')}" if attrs.get('useCase') else "",
        f"Material: {attrs.get('material')}" if attrs.get('material') else "",
        f"Variant: {attrs.get('variant')}" if attrs.get('variant') else "",
        product.get("description", ""),
        f"Tags: {', '.join(product.get('tags') or [])}" if product.get("tags") else "",
    ]
    return normalize_text(". ".join(str(x) for x in pieces if x))[:4000]
