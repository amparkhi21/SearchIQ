from app.services.review_summarizer import summarize_reviews


def test_review_summary_has_pros_cons():
    result = summarize_reviews(
        [
            {"rating": 5, "text": "Very comfortable and excellent quality."},
            {"rating": 1, "text": "Delivery was slow and the package was damaged."},
        ]
    )
    assert result["reviewCount"] == 2
    assert result["pros"]
    assert result["cons"]
    assert result["averageRating"] == 3.0
