"""Embed RO + EN kb chunks with bge-m3 and upsert into Chroma.

Reads:  data/mock/kb_chunks.ro.json, data/mock/kb_chunks.en.json
Writes: Chroma collection 'kb_chunks' (persisted under CHROMA_PERSIST_DIR)

Run: python -m scripts.embed_kb
Idempotent: uses upsert keyed on chunk id, so reruns just overwrite.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from app.db.chroma import get_kb_collection
from app.embeddings.ollama import EMBED_DIM, embed_many

RO_PATH = Path("data/mock/kb_chunks.ro.json")
EN_PATH = Path("data/mock/kb_chunks.en.json")

BATCH_SIZE = 16


def _load(path: Path) -> list[dict]:
    if not path.exists():
        print(f"[err] missing {path}", file=sys.stderr)
        sys.exit(1)
    return json.loads(path.read_text(encoding="utf-8"))


def _flatten_metadata(chunk: dict) -> dict:
    """Chroma metadata values must be str/int/float/bool — scalar only."""
    return {
        "lang": chunk["lang"],
        "topic": chunk["topic"],
        "section": str(chunk["section"]),
        "section_title": chunk["section_title"],
        "source": chunk["source"],
        "created_at": chunk["created_at"],
    }


def embed_chunks(chunks: list[dict]) -> None:
    coll = get_kb_collection()
    n = len(chunks)
    for start in range(0, n, BATCH_SIZE):
        batch = chunks[start : start + BATCH_SIZE]
        texts = [c["text"] for c in batch]
        ids = [c["id"] for c in batch]
        metadatas = [_flatten_metadata(c) for c in batch]

        vectors = embed_many(texts)
        if any(len(v) != EMBED_DIM for v in vectors):
            raise RuntimeError(
                f"unexpected embedding dim; expected {EMBED_DIM}, "
                f"got {[len(v) for v in vectors]}"
            )

        coll.upsert(
            ids=ids,
            documents=texts,
            embeddings=vectors,
            metadatas=metadatas,
        )
        print(f"[ok] embedded batch {start // BATCH_SIZE + 1} ({len(batch)} chunks)")


def main() -> None:
    ro = _load(RO_PATH)
    en = _load(EN_PATH)
    all_chunks = ro + en
    print(f"[info] loaded {len(ro)} RO + {len(en)} EN = {len(all_chunks)} chunks")

    embed_chunks(all_chunks)

    coll = get_kb_collection()
    total = coll.count()
    print(f"[done] kb_chunks collection now contains {total} documents")


if __name__ == "__main__":
    main()
