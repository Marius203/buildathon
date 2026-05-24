"""
Embed agent/data/chunks.json into ChromaDB.

Run from the agent/ directory:
    python -m scripts.embed_chunks
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.chroma import get_kb_collection
from app.embeddings.ollama import embed_many

CHUNKS_PATH = Path(__file__).parent.parent / "data" / "chunks.json"
BATCH = 32


def embed_chunks():
    records: list[dict] = json.loads(CHUNKS_PATH.read_text(encoding="utf-8"))
    print(f"Loaded {len(records)} chunks from {CHUNKS_PATH}", flush=True)

    from app.db.chroma import get_client, KB_COLLECTION
    client = get_client()
    client.delete_collection(KB_COLLECTION)
    coll = get_kb_collection()
    print("ChromaDB collection reset.", flush=True)

    ids: list[str] = []
    embeddings: list[list[float]] = []
    documents: list[str] = []
    metadatas: list[dict] = []

    for i in range(0, len(records), BATCH):
        batch = records[i : i + BATCH]
        texts = [r["text"] for r in batch]
        vecs = embed_many(texts)

        for rec, vec in zip(batch, vecs):
            ids.append(rec["id"])
            embeddings.append(vec)
            documents.append(rec["text"])
            metadatas.append({
                "source": rec.get("source", ""),
                "section": rec.get("section", ""),
                "section_title": rec.get("section_title", ""),
                "lang": rec.get("lang", "en"),
                "created_at": rec.get("created_at", ""),
            })

        done = min(i + BATCH, len(records))
        print(f"  Embedded {done}/{len(records)}", end="\r", flush=True)

    coll.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)
    print(f"\n\nDone. Upserted {len(ids)} chunks into '{coll.name}'.")


if __name__ == "__main__":
    embed_chunks()
