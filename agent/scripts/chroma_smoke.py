"""Smoke test: verify Chroma persistence works end-to-end with fake embeddings.

Run: python -m scripts.chroma_smoke
Expected: prints '[ok] ...' lines and exits 0. Idempotent across runs.
"""
from __future__ import annotations

import random

from app.db.chroma import KB_COLLECTION, get_client, get_kb_collection


def fake_embedding(seed: int, dims: int = 1024) -> list[float]:
    rng = random.Random(seed)
    return [rng.uniform(-1, 1) for _ in range(dims)]


def main() -> None:
    client = get_client()
    print(f"[ok] chroma client ready, persist_dir resolved")

    coll = get_kb_collection()
    print(f"[ok] collection '{KB_COLLECTION}' opened, current count = {coll.count()}")

    coll.upsert(
        ids=["smoke-1", "smoke-2"],
        documents=[
            "Trenul EC pleaca din Gara Mica din Cluj-Napoca.",
            "EC Village este campingul oficial la 5-7 minute de mers pe jos.",
        ],
        embeddings=[fake_embedding(1), fake_embedding(2)],
        metadatas=[
            {"lang": "ro", "topic": "transport", "source": "smoke"},
            {"lang": "ro", "topic": "camping", "source": "smoke"},
        ],
    )
    print(f"[ok] upserted 2 smoke chunks, count = {coll.count()}")

    res = coll.query(
        query_embeddings=[fake_embedding(1)],
        n_results=1,
        where={"lang": "ro"},
    )
    top_id = res["ids"][0][0]
    print(f"[ok] queried by embedding + lang filter, top id = {top_id}")

    coll.delete(ids=["smoke-1", "smoke-2"])
    print(f"[ok] cleaned up smoke chunks, count = {coll.count()}")


if __name__ == "__main__":
    main()
