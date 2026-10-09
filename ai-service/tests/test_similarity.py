from app.services.similarity import cosine_similarity


def test_cosine_identity():
    assert round(cosine_similarity([1, 0], [1, 0]), 6) == 1.0


def test_cosine_orthogonal():
    assert round(cosine_similarity([1, 0], [0, 1]), 6) == 0.0
