"""Reciprocal Rank Fusion.

Given multiple ranked lists of ids, returns a single fused ranking.
score(id) = sum over lists of 1 / (k + rank(id, list))   (rank is 1-based)
Standard k = 60 from the original Cormack/Clarke/Buettcher paper.
"""
from __future__ import annotations

from collections import defaultdict


def fuse(ranked_lists: list[list[str]], *, k: int = 60) -> list[tuple[str, float]]:
    scores: dict[str, float] = defaultdict(float)
    for lst in ranked_lists:
        for rank, doc_id in enumerate(lst, start=1):
            scores[doc_id] += 1.0 / (k + rank)
    return sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
