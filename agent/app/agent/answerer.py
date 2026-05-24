"""End-to-end answerer: retrieve via search_kb, generate via Claude.

If retrieval has no strong match (top vector distance >= LOW_CONFIDENCE_DISTANCE),
swap to a "no context" prompt so the model refuses cleanly instead of riffing.
"""
from __future__ import annotations

from typing import Any
from collections.abc import AsyncIterator, Iterator

from app.agent.prompts import format_context, no_context_prompt, system_prompt
from app.llm.claude_client import CLAUDE_MODEL, chat, chat_stream, chat_stream_async
from app.tools.search_kb import DEFAULT_K, has_strong_match, search_kb

ANSWERER_MODEL = CLAUDE_MODEL

LLM_OPTIONS = {"temperature": 0.5}


def _build_messages(sys: str, history: list[dict], query: str) -> list[dict]:
    return [{"role": "system", "content": sys}, *history, {"role": "user", "content": query}]


def answer(
    query: str,
    lang: str = "en",
    topic: str | None = None,
    k: int = DEFAULT_K,
    history: list[dict] | None = None,
) -> dict[str, Any]:
    history = history or []
    chunks = search_kb(query, lang=lang, topic=topic, k=k)

    if not chunks or not has_strong_match(chunks):
        msg = chat(
            messages=_build_messages(no_context_prompt(lang), history, query),
            model=ANSWERER_MODEL,
            options=LLM_OPTIONS,
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
    msg = chat(
        messages=_build_messages(system_prompt(lang, context), history, query),
        model=ANSWERER_MODEL,
        options=LLM_OPTIONS,
    )
    return {
        "query": query,
        "lang": lang,
        "topic": topic,
        "answer": msg.get("content", "").strip(),
        "sources": [
            {
                "id": c["id"],
                "section": c.get("section"),
                "section_title": c.get("section_title"),
                "score": c.get("score"),
                "vector_distance": c.get("vector_distance"),
            }
            for c in chunks
        ],
        "low_confidence": False,
    }


def answer_stream(
    query: str,
    lang: str = "en",
    topic: str | None = None,
    k: int = DEFAULT_K,
    history: list[dict] | None = None,
) -> Iterator[dict[str, Any]]:
    """Yield {"token": str} dicts while generating, then a final {"done": True, ...} dict."""
    history = history or []
    chunks = search_kb(query, lang=lang, topic=topic, k=k)

    if not chunks or not has_strong_match(chunks):
        for token in chat_stream(
            messages=_build_messages(no_context_prompt(lang), history, query),
            model=ANSWERER_MODEL,
            options=LLM_OPTIONS,
        ):
            yield {"token": token}
        yield {"done": True, "sources": [], "low_confidence": True}
        return

    context = format_context(chunks)
    for token in chat_stream(
        messages=_build_messages(system_prompt(lang, context), history, query),
        model=ANSWERER_MODEL,
        options=LLM_OPTIONS,
    ):
        yield {"token": token}

    sources = [
        {
            "id": c["id"],
            "section": c.get("section"),
            "section_title": c.get("section_title"),
            "score": c.get("score"),
            "vector_distance": c.get("vector_distance"),
        }
        for c in chunks
    ]
    yield {"done": True, "sources": sources, "low_confidence": False}


async def answer_stream_async(
    query: str,
    lang: str = "en",
    topic: str | None = None,
    k: int = DEFAULT_K,
    history: list[dict] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Async version — keeps the event loop free while Claude streams tokens."""
    history = history or []
    chunks = search_kb(query, lang=lang, topic=topic, k=k)

    if not chunks or not has_strong_match(chunks):
        async for token in chat_stream_async(
            messages=_build_messages(no_context_prompt(lang), history, query),
            model=ANSWERER_MODEL,
            options=LLM_OPTIONS,
        ):
            yield {"token": token}
        yield {"done": True, "sources": [], "low_confidence": True}
        return

    context = format_context(chunks)
    async for token in chat_stream_async(
        messages=_build_messages(system_prompt(lang, context), history, query),
        model=ANSWERER_MODEL,
        options=LLM_OPTIONS,
    ):
        yield {"token": token}

    sources = [
        {
            "id": c["id"],
            "section": c.get("section"),
            "section_title": c.get("section_title"),
            "score": c.get("score"),
            "vector_distance": c.get("vector_distance"),
        }
        for c in chunks
    ]
    yield {"done": True, "sources": sources, "low_confidence": False}
