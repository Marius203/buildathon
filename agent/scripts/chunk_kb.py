"""Parse kb/kb.md into structural RO chunks and dump to data/mock/kb_chunks.ro.json.

Strategy (per HANDOFF section 7, step 2):
  - One chunk per numbered section (1..23)
  - Section 24 (vector-database summary) is skipped to avoid retrieval domination
  - Sections 9 and 10 are sub-split by their internal sub-headings
  - The pre-section intro paragraph becomes section "0" (overview)
  - Each chunk gets lang=ro, source=kb_md_2026, topic from a hand mapping

Run: python -m scripts.chunk_kb
Output: data/mock/kb_chunks.ro.json (idempotent, fully regenerated each run)
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

KB_PATH = Path("kb/kb.md")
OUT_PATH = Path("data/mock/kb_chunks.ro.json")

# Section -> topic mapping. Sub-split sections (9, 10) inherit the parent topic.
TOPIC_BY_SECTION: dict[str, str] = {
    "0": "overview",
    "1": "overview",
    "2": "dates_location",
    "3": "lineup",
    "4": "tickets",
    "5": "tickets",
    "6": "tickets",
    "7": "tickets",
    "8": "cashless",
    "9": "transport",
    "10": "camping",
    "11": "accommodation",
    "12": "facilities",
    "13": "safety",
    "14": "rules",
    "15": "children",
    "16": "accessibility",
    "17": "experience",
    "18": "packing",
    "19": "packing",
    "20": "food",
    "21": "budget",
    "22": "tips",
    "23": "audience",
}

# Sub-headings that introduce sub-chunks inside a section.
# Order matters — must match the order they appear in kb.md.
SUB_HEADINGS: dict[str, list[str]] = {
    "9": ["Trenuri EC", "Autobuze", "CFR", "Cu mașina", "Taxi, Uber, aeroport"],
    "10": ["Ce poți aduce în camping", "Ce nu poți aduce în camping"],
}

# Skip entirely.
SKIP_SECTIONS = {"24"}

SECTION_HEADER_RE = re.compile(r"^(\d{1,2})\)\s+(.+)$")


def _read_kb() -> str:
    if not KB_PATH.exists():
        raise FileNotFoundError(f"kb file missing: {KB_PATH.resolve()}")
    return KB_PATH.read_text(encoding="utf-8")


def _split_sections(raw: str) -> list[tuple[str, str, str]]:
    """Return [(section_num, title, body)]. section_num '0' = pre-section intro."""
    lines = raw.splitlines()
    sections: list[tuple[str, str, list[str]]] = []
    intro_lines: list[str] = []
    current: tuple[str, str] | None = None
    current_body: list[str] = []

    for line in lines:
        m = SECTION_HEADER_RE.match(line.strip())
        if m:
            if current is not None:
                sections.append((current[0], current[1], current_body))
            else:
                # Save intro before first numbered section.
                sections.append(("0", "Introducere", intro_lines))
            current = (m.group(1), m.group(2).strip())
            current_body = []
        else:
            if current is None:
                intro_lines.append(line)
            else:
                current_body.append(line)
    if current is not None:
        sections.append((current[0], current[1], current_body))

    out: list[tuple[str, str, str]] = []
    for num, title, body_lines in sections:
        body = "\n".join(body_lines).strip()
        if not body:
            continue
        out.append((num, title, body))
    return out


def _split_by_subheadings(body: str, headings: list[str]) -> list[tuple[str, str]]:
    """Split a section body by known sub-headings.

    Returns [(sub_title, sub_body)]. The text before the first sub-heading
    becomes a chunk titled 'Prezentare generală' (general overview).
    """
    parts: list[tuple[str, str]] = []
    cursor = 0
    positions: list[tuple[int, str]] = []
    for h in headings:
        # Match sub-heading as standalone line.
        pat = re.compile(rf"(?m)^{re.escape(h)}\s*$")
        m = pat.search(body)
        if m is None:
            raise ValueError(f"sub-heading not found in body: {h!r}")
        positions.append((m.start(), h))
    positions.sort()

    preamble = body[: positions[0][0]].strip()
    if preamble:
        parts.append(("Prezentare generală", preamble))

    for i, (start, heading) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(body)
        chunk_body = body[start + len(heading) : end].strip()
        if chunk_body:
            parts.append((heading, chunk_body))

    return parts


def _normalize(text: str) -> str:
    """Collapse hyper-aggressive blank-line runs but preserve paragraph breaks."""
    out_lines: list[str] = []
    blank_run = 0
    for line in text.splitlines():
        if line.strip() == "":
            blank_run += 1
            if blank_run <= 1:
                out_lines.append("")
        else:
            blank_run = 0
            out_lines.append(line.rstrip())
    return "\n".join(out_lines).strip()


def chunk() -> list[dict]:
    raw = _read_kb()
    sections = _split_sections(raw)
    now = datetime.now(timezone.utc).isoformat()
    chunks: list[dict] = []

    for num, title, body in sections:
        if num in SKIP_SECTIONS:
            continue
        topic = TOPIC_BY_SECTION.get(num)
        if topic is None:
            raise ValueError(f"no topic mapping for section {num}")

        if num in SUB_HEADINGS:
            sub_parts = _split_by_subheadings(body, SUB_HEADINGS[num])
            for idx, (sub_title, sub_body) in enumerate(sub_parts, start=1):
                section_id = f"{num}.{idx}"
                chunks.append(
                    {
                        "id": f"kb_md_2026_ro_s{num}_{idx}",
                        "text": _normalize(sub_body),
                        "lang": "ro",
                        "topic": topic,
                        "section": section_id,
                        "section_title": f"{title} — {sub_title}",
                        "source": "kb_md_2026",
                        "created_at": now,
                    }
                )
        else:
            chunks.append(
                {
                    "id": f"kb_md_2026_ro_s{num}",
                    "text": _normalize(body),
                    "lang": "ro",
                    "topic": topic,
                    "section": num,
                    "section_title": title,
                    "source": "kb_md_2026",
                    "created_at": now,
                }
            )

    return chunks


def main() -> None:
    chunks = chunk()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(chunks, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[ok] wrote {len(chunks)} chunks -> {OUT_PATH}")
    by_topic: dict[str, int] = {}
    for c in chunks:
        by_topic[c["topic"]] = by_topic.get(c["topic"], 0) + 1
    print("[ok] chunks per topic:")
    for topic, n in sorted(by_topic.items(), key=lambda x: (-x[1], x[0])):
        print(f"        {topic:18s} {n}")
    sizes = [len(c["text"]) for c in chunks]
    print(
        f"[ok] text length (chars): min={min(sizes)} median~{sorted(sizes)[len(sizes)//2]} max={max(sizes)}"
    )


if __name__ == "__main__":
    main()
