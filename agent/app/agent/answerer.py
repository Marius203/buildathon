"""End-to-end answerer: retrieve via search_kb, generate via qwen 14b.

If retrieval has no strong match (top vector distance >= LOW_CONFIDENCE_DISTANCE),
swap to a "no context" prompt so the model refuses cleanly instead of riffing.
"""
from __future__ import annotations

from typing import Any

from app.agent.prompts import format_context, no_context_prompt, system_prompt
from app.llm.ollama_client import OLLAMA_MAIN_MODEL, chat
from app.tools.search_kb import DEFAULT_K, has_strong_match, search_kb

# Use the big model: 14b is far better at Romanian fluency and at following
# the few-shot anti-hallucination rules in the system prompt.
ANSWERER_MODEL = OLLAMA_MAIN_MODEL


def answer(
    query: str,
    lang: str = "en",
    topic: str | None = None,
    k: int = DEFAULT_K,
) -> dict[str, Any]:
    chunks = search_kb(query, lang=lang, topic=topic, k=k)

    if not chunks or not has_strong_match(chunks):
        # No relevant context — short-circuit to a clean refusal.
        msg = chat(
            messages=[
                {"role": "system", "content": no_context_prompt(lang)},
                {"role": "user", "content": query},
            ],
            model=ANSWERER_MODEL,
            options={"temperature": 0.2},
        )
        return {
            "query": query,
            "lang": lang,
            "topic": topic,
            "answer": msg.get("content", "").strip(),
            "sources": [],
            "low_confidence": True,
        }

    context = format_context(chunks)
    sys = system_prompt(lang, context)
    msg = chat(
        messages=[
            {"role": "system", "content": sys},
            {"role": "user", "content": query},
        ],
        model=ANSWERER_MODEL,
        options={"temperature": 0.2},
    )
    text = msg.get("content", "").strip()
    return {
        "query": query,
        "lang": lang,
        "topic": topic,
        "answer": text,
        "sources": [
            {
                "id": c["id"],
                "section": c.get("section"),
                "section_title": c.get("section_title"),
                "topic": c.get("topic"),
                "score": c.get("score"),
                "vector_distance": c.get("vector_distance"),
            }
            for c in chunks
        ],
        "low_confidence": False,
    }
