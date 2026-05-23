"""Claude (Anthropic) chat wrapper. Mirrors the surface of ollama_client so
the answerer can swap backends with just an import change.

Anthropic's API takes `system` as a top-level parameter, not a message — so
we extract any leading `{"role": "system"}` entry before sending.
"""
from __future__ import annotations

import os
from collections.abc import AsyncIterator, Iterator
from typing import Any

from anthropic import Anthropic, AsyncAnthropic
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
CLAUDE_MAX_TOKENS = int(os.getenv("CLAUDE_MAX_TOKENS", "1024"))

if not CLAUDE_API_KEY:
    # Defer the error to call time so import doesn't crash tooling that just
    # inspects the module (e.g. uvicorn --reload startup probes).
    pass


def _split_system(messages: list[dict[str, Any]]) -> tuple[str | None, list[dict[str, Any]]]:
    system: str | None = None
    rest: list[dict[str, Any]] = []
    for m in messages:
        if m.get("role") == "system" and system is None:
            system = m.get("content", "")
        else:
            rest.append({"role": m["role"], "content": m["content"]})
    return system, rest


def _client() -> Anthropic:
    if not CLAUDE_API_KEY:
        raise RuntimeError("CLAUDE_API_KEY is not set in the environment / .env")
    return Anthropic(api_key=CLAUDE_API_KEY)


def _async_client() -> AsyncAnthropic:
    if not CLAUDE_API_KEY:
        raise RuntimeError("CLAUDE_API_KEY is not set in the environment / .env")
    return AsyncAnthropic(api_key=CLAUDE_API_KEY)


def chat(
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    options: dict[str, Any] | None = None,
    **_: Any,  # accept (and ignore) ollama-specific kwargs like format_json/tools
) -> dict[str, Any]:
    """Non-streaming call. Returns a dict shaped like Ollama's: {"role", "content"}."""
    system, msgs = _split_system(messages)
    temperature = (options or {}).get("temperature", 0.2)

    resp = _client().messages.create(
        model=model or CLAUDE_MODEL,
        max_tokens=CLAUDE_MAX_TOKENS,
        temperature=temperature,
        system=system or "",
        messages=msgs,
    )
    text = "".join(block.text for block in resp.content if getattr(block, "type", None) == "text")
    return {"role": "assistant", "content": text}


def chat_stream(
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    options: dict[str, Any] | None = None,
) -> Iterator[str]:
    system, msgs = _split_system(messages)
    temperature = (options or {}).get("temperature", 0.2)

    with _client().messages.stream(
        model=model or CLAUDE_MODEL,
        max_tokens=CLAUDE_MAX_TOKENS,
        temperature=temperature,
        system=system or "",
        messages=msgs,
    ) as stream:
        for text in stream.text_stream:
            if text:
                yield text


def detect_language(text: str) -> str:
    """Returns 'ro' or 'en'. Uses Haiku as a cheap classifier; falls back to
    'en' on any error so the caller can decide whether to retry."""
    if not text.strip():
        return "en"
    try:
        resp = _client().messages.create(
            model=CLAUDE_MODEL,
            max_tokens=2,
            temperature=0,
            system="You classify the language of the user's message. Reply with exactly one token: 'ro' for Romanian, 'en' for anything else (English, mixed, unknown). No punctuation, no explanation.",
            messages=[{"role": "user", "content": text[:500]}],
        )
        out = "".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip().lower()
        return "ro" if out.startswith("ro") else "en"
    except Exception:
        return "en"


async def chat_stream_async(
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    options: dict[str, Any] | None = None,
) -> AsyncIterator[str]:
    system, msgs = _split_system(messages)
    temperature = (options or {}).get("temperature", 0.2)

    async with _async_client().messages.stream(
        model=model or CLAUDE_MODEL,
        max_tokens=CLAUDE_MAX_TOKENS,
        temperature=temperature,
        system=system or "",
        messages=msgs,
    ) as stream:
        async for text in stream.text_stream:
            if text:
                yield text
