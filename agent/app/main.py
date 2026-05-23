"""FastAPI entrypoint. Right now exposes /health and /search.
Run: .venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Literal

import json

import httpx
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agent.answerer import answer as run_answer, answer_stream_async as run_answer_stream
from app.db.chroma import get_kb_collection
from app.embeddings.ollama import OLLAMA_BASE_URL
from app.lib.bm25_index import build_indexes, get_store
from app.llm.claude_client import detect_language
from app.tools.search_kb import search_kb


@asynccontextmanager
async def lifespan(_: FastAPI):
    build_indexes()
    yield


app = FastAPI(title="EC Assistant Backend", lifespan=lifespan)


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    lang: Literal["ro", "en"] = "en"
    topic: str | None = None
    k: int = Field(default=5, ge=1, le=20)


class SearchHit(BaseModel):
    id: str
    score: float
    vector_distance: float | None = None
    text: str
    topic: str | None
    section: str | None
    section_title: str | None
    source: str | None
    lang: str | None


class SearchResponse(BaseModel):
    query: str
    lang: str
    topic: str | None
    results: list[SearchHit]


@app.get("/health")
async def health() -> dict:
    """Pings Chroma, BM25, and Ollama. Reports per-component status."""
    out: dict = {"status": "ok", "components": {}}

    try:
        n = get_kb_collection().count()
        out["components"]["chroma"] = {"status": "ok", "kb_chunks_count": n}
    except Exception as exc:
        out["status"] = "degraded"
        out["components"]["chroma"] = {"status": "error", "detail": str(exc)}

    try:
        store = get_store()
        out["components"]["bm25"] = {
            "status": "ok",
            "languages": {lang: len(idx.ids) for lang, idx in store.by_lang.items()},
        }
    except Exception as exc:
        out["status"] = "degraded"
        out["components"]["bm25"] = {"status": "error", "detail": str(exc)}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            r.raise_for_status()
            models = [m["name"] for m in r.json().get("models", [])]
            out["components"]["ollama"] = {"status": "ok", "models": models}
    except Exception as exc:
        out["status"] = "degraded"
        out["components"]["ollama"] = {"status": "error", "detail": str(exc)}

    return out


@app.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest) -> SearchResponse:
    hits = search_kb(req.query, lang=req.lang, topic=req.topic, k=req.k)
    return SearchResponse(
        query=req.query,
        lang=req.lang,
        topic=req.topic,
        results=[SearchHit(**h) for h in hits],
    )


class AnswerRequest(BaseModel):
    query: str = Field(min_length=1)
    lang: Literal["ro", "en"] = "en"
    topic: str | None = None
    k: int = Field(default=3, ge=1, le=20)


class AnswerSource(BaseModel):
    id: str
    section: str | None
    section_title: str | None
    topic: str | None
    score: float | None
    vector_distance: float | None = None


class AnswerResponse(BaseModel):
    query: str
    lang: str
    topic: str | None
    answer: str
    sources: list[AnswerSource]
    low_confidence: bool = False


@app.post("/answer/stream")
async def answer_stream(req: AnswerRequest) -> StreamingResponse:
    async def generate():
        async for event in run_answer_stream(req.query, lang=req.lang, topic=req.topic, k=req.k):
            yield json.dumps(event) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")


class DetectLangRequest(BaseModel):
    text: str = Field(min_length=1)


class DetectLangResponse(BaseModel):
    lang: Literal["ro", "en"]


@app.post("/detect-lang", response_model=DetectLangResponse)
async def detect_lang(req: DetectLangRequest) -> DetectLangResponse:
    return DetectLangResponse(lang=detect_language(req.text))


@app.post("/answer", response_model=AnswerResponse)
async def answer(req: AnswerRequest) -> AnswerResponse:
    result = run_answer(req.query, lang=req.lang, topic=req.topic, k=req.k)
    return AnswerResponse(
        query=result["query"],
        lang=result["lang"],
        topic=result["topic"],
        answer=result["answer"],
        sources=[AnswerSource(**s) for s in result["sources"]],
        low_confidence=result.get("low_confidence", False),
    )
