"""Per-session language detection.

Primary path: ask the agent service (Claude Haiku classifier) which is robust
to mixed text, slang, and short messages. Falls back to a cheap heuristic if
the agent is unreachable, so a session never blocks on language detection.
"""
from __future__ import annotations

import re

import httpx

AGENT_URL = "http://localhost:8000"

RO_DIACRITICS = set("ăâîșțĂÂÎȘȚșțȘȚ")

RO_STOPWORDS = {
    "și", "si", "cu", "la", "în", "in", "nu", "că", "ca", "de", "pe", "ce",
    "cum", "este", "sunt", "mă", "ma", "îmi", "imi", "îți", "iti", "pentru",
    "din", "până", "pana", "către", "catre", "decât", "decat",
    "vreau", "vrem", "vrei", "as", "aș", "ași", "putem", "pot", "poți", "poti",
    "facem", "fac", "face", "trebuie", "ajung", "ajungem", "merg", "mergem",
    "aduc", "aduci", "iau", "iei", "stiu", "știu", "spune", "spun",
    "bilet", "bilete", "cazare", "cort",
    "salut", "multumesc", "mulțumesc", "buna",
}

_WORD_RE = re.compile(r"[a-zA-ZăâîșțĂÂÎȘȚ]+", re.UNICODE)


def _heuristic(text: str) -> str:
    if not text:
        return "en"
    if any(ch in RO_DIACRITICS for ch in text):
        return "ro"
    tokens = {w.lower() for w in _WORD_RE.findall(text)}
    if tokens & RO_STOPWORDS:
        return "ro"
    return "en"


async def detect_lang(text: str) -> str:
    """Ask the agent (Claude) first; fall back to heuristic on any failure."""
    if not text or not text.strip():
        return "en"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(f"{AGENT_URL}/detect-lang", json={"text": text})
            res.raise_for_status()
            data = res.json()
            lang = data.get("lang", "en")
            return "ro" if lang == "ro" else "en"
    except Exception:
        return _heuristic(text)
