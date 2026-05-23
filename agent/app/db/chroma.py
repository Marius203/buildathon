"""Chroma persistent client + collection accessor.

Embeddings are computed externally (via Ollama bge-m3) and passed in explicitly
on add/query. We do NOT use Chroma's built-in embedding functions — keeping
embedding generation in our own code makes the model swap trivial.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

KB_COLLECTION = "kb_chunks"


@lru_cache(maxsize=1)
def get_client() -> ClientAPI:
    persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")
    Path(persist_dir).mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=persist_dir)


def get_kb_collection() -> Collection:
    """Return the kb_chunks collection, creating it if absent.

    Cosine distance matches bge-m3's training objective.
    """
    return get_client().get_or_create_collection(
        name=KB_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )
