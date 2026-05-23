"""End-to-end answerer: retrieve via search_kb, generate via Claude Haiku.

If retrieval has no strong match (top vector distance >= LOW_CONFIDENCE_DISTANCE),
swap to a "no context" prompt so the model refuses cleanly instead of riffing.

When `history` is supplied (prior turns of the session), it's used in two ways:
- to rewrite vague follow-ups ("da", "and how much?") into standalone search queries
- to give Claude the full conversation so it understands references and context
"""
from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from typing import Any

from app.agent.prompts import format_context, no_context_prompt, system_prompt
from app.llm.claude_client import CLAUDE_MODEL, chat, chat_stream, chat_stream_async, rewrite_query
from app.tools.search_kb import DEFAULT_K, has_strong_match, search_kb

ANSWERER_MODEL = CLAUDE_MODEL

LLM_OPTIONS = {"temperature": 0.5}


def _build_messages(system_content: str, history: list[dict[str, Any]], query: str) -> list[dict[str, Any]]:
    msgs: list[dict[str, Any]] = [{"role": "system", "content": system_content}]
    for m in history:
        role = m.get("role")
        content = m.get("content")
        if role in ("user", "assistant") and content:
            msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": query})
    return msgs


def _retrieval_query(query: str, history: list[dict[str, Any]]) -> str:
    if not history:
        return query
    return rewrite_query(query, history)


def _sources_payload(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": c["id"],
            "section": c.get("section"),
            "section_title": c.get("section_title"),
            "topic": c.get("topic"),
            "score": c.get("score"),
            "vector_distance": c.get("vector_distance"),
        }
        for c in chunks
    ]


def answer(
    query: str,
    lang: str = "en",
    topic: str | None = None,
    k: int = DEFAULT_K,
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    history = history or []
    search_query = _retrieval_query(query, history)
    chunks = search_kb(search_query, lang=lang, topic=topic, k=k)

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
    sys = system_prompt(lang, context)
    msg = chat(
        messages=_build_messages(sys, history, query),
        model=ANSWERER_MODEL,
        options=LLM_OPTIONS,
    )
    return {
        "query": query,
        "lang": lang,
        "topic": topic,
        "answer": msg.get("content", "").strip(),
        "sources": _sources_payload(chunks),
        "low_confidence": False,
    }


def answer_stream(
    query: str,
    lang: str = "en",
    topic: str | None = None,
    k: int = DEFAULT_K,
    history: list[dict[str, Any]] | None = None,
) -> Iterator[dict[str, Any]]:
    history = history or []
    search_query = _retrieval_query(query, history)
    chunks = search_kb(search_query, lang=lang, topic=topic, k=k)

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
    sys = system_prompt(lang, context)
    for token in chat_stream(
        messages=_build_messages(sys, history, query),
        model=ANSWERER_MODEL,
        options=LLM_OPTIONS,
    ):
        yield {"token": token}

    yield {"done": True, "sources": _sources_payload(chunks), "low_confidence": False}


async def answer_stream_async(
    query: str,
    lang: str = "en",
    topic: str | None = None,
    k: int = DEFAULT_K,
    history: list[dict[str, Any]] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    history = history or []
    search_query = _retrieval_query(query, history)
    chunks = search_kb(search_query, lang=lang, topic=topic, k=k)

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
    sys_msg = system_prompt(lang, context)
    async for token in chat_stream_async(
        messages=_build_messages(sys_msg, history, query),
        model=ANSWERER_MODEL,
        options=LLM_OPTIONS,
    ):
        yield {"token": token}

    yield {"done": True, "sources": _sources_payload(chunks), "low_confidence": False}
