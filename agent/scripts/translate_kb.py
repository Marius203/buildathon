"""Translate RO chunks -> EN using qwen2.5:3b via Ollama.

Reads:  data/mock/kb_chunks.ro.json
Writes: data/mock/kb_chunks.en.json (resumable — keeps already-translated entries)

Run: python -m scripts.translate_kb
Force re-translate one chunk: delete its entry from kb_chunks.en.json and rerun.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from app.llm.ollama_client import OLLAMA_SMALL_MODEL, chat

IN_PATH = Path("data/mock/kb_chunks.ro.json")
OUT_PATH = Path("data/mock/kb_chunks.en.json")

SYSTEM_PROMPT = (
    "You are a professional Romanian-to-English translator working on festival guide "
    "content for first-time attendees of Electric Castle festival in Romania. "
    "Translate the user's Romanian text into natural, idiomatic English. "
    "Preserve all proper nouns exactly (Electric Castle, EC Village, Bánffy, Bonțida, "
    "Cluj-Napoca, Jucu, The Cure, Twenty One Pilots, etc.). "
    "Keep all numbers, prices in EUR/RON, dates, and times exact. "
    "Keep paragraph breaks. Do not add commentary, headers, bullet points, or notes — "
    "output only the translated text."
)


def translate_one(ro_text: str) -> str:
    msg = chat(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": ro_text},
        ],
        model=OLLAMA_SMALL_MODEL,
        options={"temperature": 0.2, "num_ctx": 4096},
    )
    content = msg.get("content", "").strip()
    if not content:
        raise RuntimeError("empty translation returned")
    return content


def main() -> None:
    if not IN_PATH.exists():
        print(f"[err] missing {IN_PATH}; run scripts.chunk_kb first", file=sys.stderr)
        sys.exit(1)

    ro_chunks = json.loads(IN_PATH.read_text(encoding="utf-8"))
    existing: dict[str, dict] = {}
    if OUT_PATH.exists():
        for c in json.loads(OUT_PATH.read_text(encoding="utf-8")):
            existing[c["id"]] = c

    en_chunks: list[dict] = []
    total = len(ro_chunks)
    for i, ro in enumerate(ro_chunks, start=1):
        ro_id = ro["id"]
        en_id = ro_id.replace("_ro_", "_en_")

        if en_id in existing and existing[en_id].get("text"):
            en_chunks.append(existing[en_id])
            print(f"[skip] {en_id} (already translated)")
            continue

        t0 = time.time()
        try:
            en_text = translate_one(ro["text"])
        except Exception as exc:
            print(f"[err] {ro_id}: {exc}", file=sys.stderr)
            raise
        dt = time.time() - t0

        en_chunks.append(
            {
                "id": en_id,
                "text": en_text,
                "lang": "en",
                "topic": ro["topic"],
                "section": ro["section"],
                "section_title": ro["section_title"],
                "source": ro["source"],
                "created_at": ro["created_at"],
                "translated_from": ro_id,
            }
        )
        print(f"[ok]  {en_id}  ({i}/{total}, {dt:.1f}s, {len(en_text)} chars)")

        OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUT_PATH.write_text(
            json.dumps(en_chunks, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    print(f"[done] wrote {len(en_chunks)} EN chunks -> {OUT_PATH}")


if __name__ == "__main__":
    main()
