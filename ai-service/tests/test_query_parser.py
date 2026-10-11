from app.services.query_parser import extract_price, parse_query


def test_price_under_k():
    low, high, _ = extract_price("shoes under 2.5k")
    assert low is None
    assert high == 2500


def test_price_lakh():
    low, high, _ = extract_price("phone under 1.5 lakh")
    assert low is None
    assert high == 150000


def test_dimensions_are_not_prices():
    low, high, _ = extract_price("128 gb storage and 43 inch display")
    assert low is None and high is None


def test_range():
    low, high, _ = extract_price("laptop 50000-70000")
    assert low == 50000 and high == 70000


def test_query_understands_soft_signals():
    result = parse_query(
        "comfortable black shoes for college under ₹2500",
        {"categories": ["Footwear"], "brands": ["Nike", "Campus"]},
    )
    assert result["hardFilters"]["category"] == ["Footwear"]
    assert result["hardFilters"]["maxPrice"] == 2500
    assert "black" in result["softSignals"]["colors"]
    assert "college" in result["softSignals"]["useCases"]
    assert "comfort" in result["intentTags"]
    assert result["originalQuery"] == "comfortable black shoes for college under â‚¹2500"


def test_explicit_price_and_availability_and_hardware_dimensions():
    result = parse_query("laptop for coding and AI projects under 60000 with 16 gb RAM", {
        "categories": ["Electronics"],
    })
    assert result["hardFilters"]["maxPrice"] == 60000
    assert result["hardFilters"]["category"] == ["Electronics"]
    assert "inStock" not in result["hardFilters"]


def test_available_means_strict_stock_filter():
    assert parse_query("running shoes available")["hardFilters"]["inStock"] is True


def test_uncertain_fuzzy_brand_is_not_a_hard_filter():
    result = parse_query("nikr running shoes", {"brands": ["Nike", "Nikon"]})
    assert "brand" not in result["hardFilters"]


def test_query_analysis_embeds_the_original_intent(monkeypatch):
    from app.routers import query as query_router
    from app.schemas.query_schema import QueryRequest

    embedded = []

    class StubEmbeddingService:
        settings = type("Settings", (), {"embedding_version": "test", "embedding_dimensions": 2})()

        @staticmethod
        def embed_query(text):
            embedded.append(text)
            return [0.1, 0.2]

    monkeypatch.setattr(query_router, "get_embedding_service", lambda: StubEmbeddingService())
    response = query_router.analyze(QueryRequest(query="running shoes"))
    assert embedded == ["running shoes"]
    assert response["data"]["cleanQuery"] == "shoes"
