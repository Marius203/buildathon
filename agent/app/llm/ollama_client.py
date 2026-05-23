"""Ollama chat wrapper. Used now for translation (small model); will host the
agent loop later via the same /api/chat endpoint (qwen2.5 supports tool calling).
"""
from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator, Iterator
from typing import Any

import httpx
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MAIN_MODEL = os.getenv("OLLAMA_MAIN_MODEL", "qwen2.5:14b-instruct")
OLLAMA_SMALL_MODEL = os.getenv("OLLAMA_SMALL_MODEL", "qwen2.5:3b-instruct")

_TIMEOUT = httpx.Timeout(60.0, read=600.0)


def chat(
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    options: dict[str, Any] | None = None,
    format_json: bool = False,
    tools: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Call /api/chat once, no streaming. Returns the raw message dict from the
    last assistant turn (may include tool_calls for the agent loop later).
    """
    model = model or OLLAMA_MAIN_MODEL
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": False,
    }
    if options:
        payload["options"] = options
    if format_json:
        payload["format"] = "json"
    if tools:
        payload["tools"] = tools

    with httpx.Client(base_url=OLLAMA_BASE_URL, timeout=_TIMEOUT) as client:
        r = client.post("/api/chat", json=payload)
        r.raise_for_status()
        data = r.json()
    msg = data.get("message")
    if not isinstance(msg, dict):
        raise RuntimeError(f"unexpected /api/chat response: {data}")
    return msg


def chat_stream(
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    options: dict[str, Any] | None = None,
) -> Iterator[str]:
    """Call /api/chat with stream=True, yielding text tokens as they arrive."""
    model = model or OLLAMA_MAIN_MODEL
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": True,
    }
    if options:
        payload["options"] = options

    with httpx.Client(base_url=OLLAMA_BASE_URL, timeout=_TIMEOUT) as client:
        with client.stream("POST", "/api/chat", json=payload) as r:
            r.raise_for_status()
            for line in r.iter_lines():
                if not line:
                    continue
                data = json.loads(line)
                token = data.get("message", {}).get("content", "")
                if token:
                    yield token
                if data.get("done"):
                    break


async def chat_stream_async(
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    options: dict[str, Any] | None = None,
) -> AsyncIterator[str]:
    """Async streaming — does not block the event loop."""
    model = model or OLLAMA_MAIN_MODEL
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": True,
    }
    if options:
        payload["options"] = options

    async with httpx.AsyncClient(base_url=OLLAMA_BASE_URL, timeout=_TIMEOUT) as client:
        async with client.stream("POST", "/api/chat", json=payload) as r:
            if r.status_code != 200:
                body = await r.aread()
                raise RuntimeError(
                    f"Ollama /api/chat returned {r.status_code}: {body.decode(errors='replace')[:1000]}"
                )
            async for line in r.aiter_lines():
                if not line:
                    continue
                data = json.loads(line)
                token = data.get("message", {}).get("content", "")
                if token:
                    yield token
                if data.get("done"):
                    break
