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
