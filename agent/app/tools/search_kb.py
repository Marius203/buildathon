"""search_kb: hybrid retrieval over kb_chunks (Chroma vector + BM25, RRF-fused)."""
from __future__ import annotations

from typing import Any

from app.db.chroma import get_kb_collection
from app.embeddings.ollama import embed_one
from app.lib.bm25_index import get_store
from app.lib.rrf import fuse

DEFAULT_K = 3
CANDIDATE_K = 20  # pull this many from each retriever before fusing
# Cosine distance threshold above which we consider retrieval "weak" / out-of-domain.
# bge-m3 typical good matches sit at 0.25–0.40; >0.55 means nothing in KB is close.
LOW_CONFIDENCE_DISTANCE = 0.55


def search_kb(
    query: str,
    lang: str,
    topic: str | None = None,
    k: int = DEFAULT_K,
) -> list[dict[str, Any]]:
    if not query.strip():
        return []

    where: dict[str, Any] = {"lang": lang}
    if topic:
        where = {"$and": [{"lang": lang}, {"topic": topic}]}

    qvec = embed_one(query)
    chroma = get_kb_collection().query(
        query_embeddings=[qvec],
        n_results=CANDIDATE_K,
        where=where,
    )
    vector_ids: list[str] = chroma["ids"][0]
    docs_by_id: dict[str, str] = dict(zip(chroma["ids"][0], chroma["documents"][0]))
    meta_by_id: dict[str, dict] = dict(zip(chroma["ids"][0], chroma["metadatas"][0]))
    vec_dist_by_id: dict[str, float] = dict(zip(chroma["ids"][0], chroma["distances"][0]))

    store = get_store()
    idx = store.by_lang.get(lang)
    bm_meta_by_id: dict[str, dict] = {}
    bm_docs_by_id: dict[str, str] = {}
    if idx is not None:
        bm_meta_by_id = dict(zip(idx.ids, idx.metadatas))
        bm_docs_by_id = dict(zip(idx.ids, idx.docs))

    bm_scores = store.score(query, lang)
    if topic:
        bm_scores = [
            (cid, s) for cid, s in bm_scores if bm_meta_by_id.get(cid, {}).get("topic") == topic
        ]
    bm_scores.sort(key=lambda kv: kv[1], reverse=True)
    bm_ids = [cid for cid, _ in bm_scores[:CANDIDATE_K]]

    # Backfill docs/metas for BM25-only ids so we can render them.
    for cid in bm_ids:
        if cid not in docs_by_id:
            docs_by_id[cid] = bm_docs_by_id.get(cid, "")
            meta_by_id[cid] = bm_meta_by_id.get(cid, {})

    fused = fuse([vector_ids, bm_ids])
    top = fused[:k]

    return [
        {
            "id": cid,
            "score": round(score, 6),
            "vector_distance": (
                round(vec_dist_by_id[cid], 4) if cid in vec_dist_by_id else None
            ),
            "text": docs_by_id.get(cid, ""),
            "topic": meta_by_id.get(cid, {}).get("topic"),
            "section": meta_by_id.get(cid, {}).get("section"),
            "section_title": meta_by_id.get(cid, {}).get("section_title"),
            "source": meta_by_id.get(cid, {}).get("source"),
            "lang": meta_by_id.get(cid, {}).get("lang"),
        }
        for cid, score in top
    ]


def has_strong_match(results: list[dict[str, Any]]) -> bool:
    """True if at least one result has a vector distance below LOW_CONFIDENCE_DISTANCE.
    Used by the answerer to short-circuit out-of-domain queries.
    """
    for r in results:
        d = r.get("vector_distance")
        if d is not None and d < LOW_CONFIDENCE_DISTANCE:
            return True
    return False
