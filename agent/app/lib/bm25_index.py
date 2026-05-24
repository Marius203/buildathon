"""In-memory BM25 index over kb_chunks, one index per language.

Built once at startup from the same Chroma collection that holds the vectors,
so both retrieval paths agree on the corpus. Rebuild by calling build_indexes()
again after re-seeding.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from rank_bm25 import BM25Okapi

from app.db.chroma import get_kb_collection

_TOKEN_RE = re.compile(r"[\wăâîșțĂÂÎȘȚ]+", re.UNICODE)


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text)]


@dataclass
class LangIndex:
    ids: list[str]
    docs: list[str]
    metadatas: list[dict]
    bm25: BM25Okapi


@dataclass
class BM25Store:
    by_lang: dict[str, LangIndex] = field(default_factory=dict)

    def score(self, query: str, lang: str) -> list[tuple[str, float]]:
        idx = self.by_lang.get(lang)
        if idx is None:
            return []
        scores = idx.bm25.get_scores(tokenize(query))
        return list(zip(idx.ids, scores))


_store: BM25Store | None = None


def build_indexes() -> BM25Store:
    """Load all kb_chunks from Chroma and build a BM25 index per language."""
    coll = get_kb_collection()
    payload = coll.get(include=["documents", "metadatas"])

    by_lang: dict[str, dict] = {}
    for cid, doc, meta in zip(payload["ids"], payload["documents"], payload["metadatas"]):
        lang = meta.get("lang", "unknown")
        bucket = by_lang.setdefault(lang, {"ids": [], "docs": [], "metas": []})
        bucket["ids"].append(cid)
        bucket["docs"].append(doc)
        bucket["metas"].append(meta)

    store = BM25Store()
    for lang, bucket in by_lang.items():
        corpus_tokens = [tokenize(d) for d in bucket["docs"]]
        store.by_lang[lang] = LangIndex(
            ids=bucket["ids"],
            docs=bucket["docs"],
            metadatas=bucket["metas"],
            bm25=BM25Okapi(corpus_tokens),
        )
    global _store
    _store = store
    return store


def get_store() -> BM25Store:
    if _store is None:
        return build_indexes()
    return _store
