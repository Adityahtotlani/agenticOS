from typing import List, Optional

_model = None


def get_embedder():
    """Lazy-load sentence-transformers model on first use (~80MB download on cold start)."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    model = get_embedder()
    return model.encode(texts, convert_to_numpy=True).tolist()


def embed_one(text: str) -> List[float]:
    return embed([text])[0]
