"""Ollama embeddings wrapper for bge-m3 (1024-dim, multilingual).

Uses the /api/embed endpoint (the newer batched variant). Falls back to
/api/embeddings (legacy, single-input) when needed. Keeps embedding generation
isolated so swapping models (e.g. to Voyage) only touches this file.
"""
from __future__ import annotations

import os

import httpx
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "bge-m3")

EMBED_DIM = 1024
_TIMEOUT = httpx.Timeout(60.0, read=120.0)


def embed_many(texts: list[str], model: str | None = None) -> list[list[float]]:
    """Embed a batch of strings. Returns one vector per input, same order."""
    if not texts:
        return []
    model = model or OLLAMA_EMBED_MODEL
    with httpx.Client(base_url=OLLAMA_BASE_URL, timeout=_TIMEOUT) as client:
        r = client.post("/api/embed", json={"model": model, "input": texts})
        r.raise_for_status()
        data = r.json()
        vectors = data.get("embeddings")
        if vectors is None:
            raise RuntimeError(f"unexpected /api/embed response: {data}")
        if len(vectors) != len(texts):
            raise RuntimeError(
                f"ollama returned {len(vectors)} vectors for {len(texts)} inputs"
            )
        return vectors


def embed_one(text: str, model: str | None = None) -> list[float]:
    return embed_many([text], model=model)[0]
