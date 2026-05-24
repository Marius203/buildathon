"""agent/app/services/ingest_service.py"""
from __future__ import annotations

import hashlib
import datetime
from typing import Any

from app.db.chroma import get_kb_collection
from app.embeddings.ollama import EMBED_DIM, embed_many

BATCH_SIZE = 16
CHUNK_SIZE = 400
CHUNK_OVERLAP = 80


def _split_text(text: str) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunks.append(text[start:end].strip())
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return [c for c in chunks if len(c) > 30]


def _chunk_id(filename: str, index: int, text: str) -> str:
    h = hashlib.md5(text.encode()).hexdigest()[:8]
    return f"upload-{filename}-{index}-{h}"


def ingest_text(text: str, filename: str, lang: str = "en") -> dict[str, Any]:
    raw_chunks = _split_text(text)
    if not raw_chunks:
        return {"chunks_added": 0}

    coll = get_kb_collection()
    now = datetime.datetime.utcnow().isoformat()

    for start in range(0, len(raw_chunks), BATCH_SIZE):
        batch_texts = raw_chunks[start:start + BATCH_SIZE]
        batch_ids = [_chunk_id(filename, start + i, t) for i, t in enumerate(batch_texts)]
        batch_meta = [
            {
                "lang": lang,
                "topic": "uploaded",
                "section": str(start + i),
                "section_title": filename,
                "source": filename,
                "created_at": now,
            }
            for i in range(len(batch_texts))
        ]

        vectors = embed_many(batch_texts)
        if any(len(v) != EMBED_DIM for v in vectors):
            raise RuntimeError("Embedding dim mismatch")

        coll.upsert(
            ids=batch_ids,
            documents=batch_texts,
            embeddings=vectors,
            metadatas=batch_meta,
        )

    # Reconstruieste BM25 ca sa includa chunk-urile noi
    from app.lib.bm25_index import build_indexes
    build_indexes()

    return {"chunks_added": len(raw_chunks)}