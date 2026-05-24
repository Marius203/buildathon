"""Anthropic Claude chat wrapper — mirrors the ollama_client interface."""
from __future__ import annotations

import os
from collections.abc import AsyncIterator, Iterator
from typing import Any

import anthropic
from dotenv import load_dotenv

load_dotenv()

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")

_client: anthropic.Anthropic | None = None
_async_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))
    return _client


def _get_async_client() -> anthropic.AsyncAnthropic:
    global _async_client
    if _async_client is None:
        _async_client = anthropic.AsyncAnthropic(api_key=os.getenv("CLAUDE_API_KEY"))
    return _async_client


def _split_messages(messages: list[dict[str, Any]]) -> tuple[str, list[dict[str, Any]]]:
    """Extract leading system message from the messages list."""
    system = ""
    rest = []
    for msg in messages:
        if msg["role"] == "system" and not rest:
            system = msg["content"]
        else:
            rest.append({"role": msg["role"], "content": msg["content"]})
    return system, rest


def chat(
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    options: dict[str, Any] | None = None,
    **_kwargs: Any,
) -> dict[str, Any]:
    system, user_messages = _split_messages(messages)
    temperature = (options or {}).get("temperature", 0.2)

    response = _get_client().messages.create(
        model=model or CLAUDE_MODEL,
        max_tokens=2048,
        system=system,
        messages=user_messages,
        temperature=temperature,
    )
    content = response.content[0].text if response.content else ""
    return {"role": "assistant", "content": content}


def chat_stream(
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    options: dict[str, Any] | None = None,
    **_kwargs: Any,
) -> Iterator[str]:
    system, user_messages = _split_messages(messages)
    temperature = (options or {}).get("temperature", 0.2)

    with _get_client().messages.stream(
        model=model or CLAUDE_MODEL,
        max_tokens=2048,
        system=system,
        messages=user_messages,
        temperature=temperature,
    ) as stream:
        for text in stream.text_stream:
            yield text


async def chat_stream_async(
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    options: dict[str, Any] | None = None,
    **_kwargs: Any,
) -> AsyncIterator[str]:
    system, user_messages = _split_messages(messages)
    temperature = (options or {}).get("temperature", 0.2)

    async with _get_async_client().messages.stream(
        model=model or CLAUDE_MODEL,
        max_tokens=2048,
        system=system,
        messages=user_messages,
        temperature=temperature,
    ) as stream:
        async for text in stream.text_stream:
            yield text
