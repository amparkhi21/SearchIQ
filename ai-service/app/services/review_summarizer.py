from __future__ import annotations

import re
from collections import Counter

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans


POSITIVE = {
    "good", "great", "excellent", "comfortable", "fast", "durable", "quality",
    "smooth", "light", "useful", "amazing", "value", "worth", "easy", "premium",
}
NEGATIVE = {
    "bad", "poor", "slow", "heavy", "weak", "broken", "expensive", "small",
    "large", "difficult", "uncomfortable", "issue", "problem", "defect", "delay",
}
THEME_TERMS = {
    "comfort": {"comfortable", "soft", "cushion", "fit", "ergonomic"},
    "quality": {"quality", "build", "material", "finish", "durable"},
    "performance": {"fast", "speed", "battery", "performance", "response"},
    "value": {"price", "value", "worth", "money", "affordable"},
    "delivery": {"delivery", "shipping", "arrived", "package", "packaging"},
}


def _sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", text or "")
    return [p.strip() for p in parts if len(p.strip().split()) >= 3]


def _rating_sentiment(rating: float) -> str:
    if rating >= 4:
        return "positive"
    if rating <= 2:
        return "negative"
    return "mixed"


def summarize_reviews(reviews: list[dict]) -> dict:
    normalized = []
    for review in reviews:
        text = str(review.get("text") or review.get("comment") or "").strip()
        if text:
            normalized.append(
                {
                    "text": text,
                    "rating": float(review.get("rating", 3)),
                }
            )

    if not normalized:
        return {"pros": [], "cons": [], "themes": [], "reviewCount": 0}

    sentences = []
    sentence_ratings = []
    for review in normalized:
        for sentence in _sentences(review["text"]):
            sentences.append(sentence)
            sentence_ratings.append(review["rating"])

    if not sentences:
        return {"pros": [], "cons": [], "themes": [], "reviewCount": len(normalized)}

    sentiments = [_rating_sentiment(r) for r in sentence_ratings]

    pros = []
    cons = []
    for sentence, sentiment in zip(sentences, sentiments):
        words = set(re.findall(r"[a-z]+", sentence.lower()))
        pos_hits = len(words & POSITIVE)
        neg_hits = len(words & NEGATIVE)
        if sentiment == "positive" or pos_hits > neg_hits:
            pros.append(sentence)
        elif sentiment == "negative" or neg_hits > pos_hits:
            cons.append(sentence)

    themes = []
    lower_sentences = [s.lower() for s in sentences]
    for theme, terms in THEME_TERMS.items():
        matches = [s for s in lower_sentences if any(term in s for term in terms)]
        if matches:
            themes.append({"name": theme, "mentions": len(matches), "example": matches[0]})

    # Add a small TF-IDF clustering layer when enough reviews exist.
    if len(sentences) >= 4:
        try:
            vectorizer = TfidfVectorizer(stop_words="english", max_features=100)
            matrix = vectorizer.fit_transform(sentences)
            cluster_count = min(4, max(2, len(sentences) // 4))
            if matrix.shape[1] > 0 and cluster_count <= len(sentences):
                labels = KMeans(n_clusters=cluster_count, random_state=42, n_init=10).fit_predict(matrix)
                counts = Counter(labels)
                for label, count in counts.most_common(3):
                    example = sentences[list(labels).index(label)]
                    themes.append({"name": f"cluster_{label + 1}", "mentions": count, "example": example})
        except ValueError:
            pass

    def dedupe(lines: list[str], limit: int) -> list[str]:
        seen = set()
        result = []
        for line in lines:
            key = line.lower()
            if key not in seen:
                seen.add(key)
                result.append(line)
            if len(result) >= limit:
                break
        return result

    return {
        "pros": dedupe(pros, 5),
        "cons": dedupe(cons, 5),
        "themes": themes[:8],
        "reviewCount": len(normalized),
        "averageRating": round(
            sum(review["rating"] for review in normalized) / len(normalized), 2
        ),
    }
