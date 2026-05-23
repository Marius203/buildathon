"""Eval harness: run /answer over a fixed test set, then have qwen 14b judge
each answer on a rubric. Use it as a prompt-engineering signal — tweak
app/agent/prompts.py, rerun, watch the score move.

Run: .venv/Scripts/python -m scripts.eval_answers
The server must be running on http://127.0.0.1:8000.
Output: data/eval/run_<timestamp>.json (full transcript + scores)
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime
from pathlib import Path

import httpx

from app.llm.ollama_client import OLLAMA_MAIN_MODEL, chat

# Force UTF-8 on Windows stdout.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BACKEND = "http://127.0.0.1:8000"
TEST_CASES_PATH = Path("data/eval/test_cases.json")
OUT_DIR = Path("data/eval")


def check_anchors(answer_text: str, anchors: list[str]) -> dict:
    """Deterministic check: which expected substrings appear in the answer
    (case-insensitive)? Catches paraphrasing-away of specific names/numbers.
    """
    if not anchors:
        return {"checked": 0, "hits": 0, "missing": []}
    text = answer_text.lower()
    missing = [a for a in anchors if a.lower() not in text]
    return {"checked": len(anchors), "hits": len(anchors) - len(missing), "missing": missing}


def progress_bar(i: int, total: int, elapsed: float, width: int = 30) -> str:
    pct = i / total if total else 0
    filled = int(width * pct)
    bar = "#" * filled + "-" * (width - filled)
    eta = (elapsed / i * (total - i)) if i else 0
    return f"[{bar}] {i}/{total} ({100*pct:5.1f}%) elapsed={elapsed:.0f}s eta~{eta:.0f}s"

JUDGE_SYSTEM = """You are a STRICT evaluator scoring a festival assistant's answers to first-time Electric Castle attendees. You will be given:
- the user's question (Q)
- the required answer language (RO or EN)
- the assistant's answer (A)
- the source chunks the assistant could see (SRC) — treat as ground truth

Score on five dimensions, each integer 1–10, then an overall 1–10 (your holistic judgment, NOT a strict average).

==== SCORING ANCHORS (use these as calibration, not the gentle defaults) ====

1. GROUNDEDNESS — does every concrete claim in A appear in SRC?
   - 10: every named place, number, price, rule in A appears in SRC. No fabricated details.
   - 7-9: minor paraphrase OK; no invented facts.
   - 4-6: contains at least one detail not present in SRC (e.g. an item, a name, a rule).
   - 1-3: multiple fabricated claims, or invents a key fact (price, date, route).
   - IMPORTANT: if Q is genuinely out-of-scope for the KB (e.g. weather forecast, lineup not in SRC) AND A correctly refuses to invent, score groundedness 9-10. A clean refusal IS grounded.

2. COMPLETENESS — does A actually answer Q?
   - 10: addresses Q directly and includes the most useful specifics from SRC.
   - 7-9: addresses Q but leaves out a clearly relevant detail that was in SRC.
   - 4-6: vague, partial, or sidesteps the question.
   - 1-3: doesn't address Q at all, OR refuses when SRC clearly contains the answer.
   - IMPORTANT: if Q is out-of-scope and A correctly refuses, score completeness 8-10 (the right action).

3. TONE — sounds like a friend who has been to EC.
   - 10: direct, specific, conversational. Uses proper names ("Gara Mică", "EC Village") and numbers ("35 lei").
   - 7-9: friendly but slightly generic.
   - 4-6: corporate/cardboard phrasing ("official transportation options", "for your convenience"). Or robot-tour-guide style.
   - 1-3: bureaucratic, formulaic, or addresses user formally ("Dumneavoastră" in RO).
   - PENALTY: if A paraphrases a proper name/number out of SRC into a generic phrase (e.g. "Gara Mică" → "the small train station"), drop tone by at least 2.

4. LANGUAGE_COMPLIANCE — fully in the required language, grammatically correct.
   - 10: native-feeling, fluent, correct grammar, all diacritics present (for RO).
   - 7-9: correct language but a small slip (one missing diacritic, one awkward phrasing).
   - 4-6: noticeable grammar errors, missing diacritics throughout, calques from English.
   - 1-3: wrong language, or so broken it sounds non-native.
   - For RO specifically: penalize "Dumneavoastră" forms, missing "ă/â/î/ș/ț", and invented words (e.g. "te potrivești cu trenul" is not idiomatic Romanian).

5. CONCISION — short, scannable, no filler.
   - 10: 1–3 short sentences, every sentence carries a fact the user needs.
   - 7-9: 3–5 sentences with one borderline-relevant detail.
   - 4-6: 5+ sentences, or a list when the question wasn't list-shaped, or restates the question.
   - 1-3: dumps everything from SRC, paragraphs of fluff.
   - NOTE: a "what to pack" or "what are my options" question IS list-shaped; a list is appropriate there and doesn't hurt concision.

==== HARD OVERRIDES ====

- If A contains ANY detail not supported by SRC: groundedness ≤ 4. No exceptions.
- If A is in the wrong language entirely: language_compliance ≤ 2.
- If A refuses to answer ("I'm not sure, check closer to festival") when SRC clearly contains the answer: completeness ≤ 4.

==== RATIONALE ====

Write rationale in English, max 3 sentences. Lead with the single biggest weakness if any (e.g. "Hallucinated detail X.", "Paraphrased 'Gara Mică' away."). If the answer is solid, say so briefly.

Output STRICT JSON only, no markdown, no preamble:
{
  "groundedness": <int 1-10>,
  "completeness": <int 1-10>,
  "tone": <int 1-10>,
  "language_compliance": <int 1-10>,
  "concision": <int 1-10>,
  "overall": <int 1-10>,
  "rationale": "<string>"
}"""


def call_answer(client: httpx.Client, case: dict) -> dict:
    payload = {"query": case["query"], "lang": case["lang"], "k": 3}
    r = client.post("/answer", json=payload, timeout=300.0)
    r.raise_for_status()
    return r.json()


def judge_one(case: dict, answer_obj: dict, retrieved_sources_text: str) -> dict:
    user_block = (
        f"QUESTION ({case['lang']}): {case['query']}\n\n"
        f"REQUIRED LANGUAGE: {case['lang']}\n\n"
        f"ASSISTANT ANSWER:\n{answer_obj.get('answer', '')}\n\n"
        f"RETRIEVED SOURCE CHUNKS (ground truth):\n{retrieved_sources_text}"
    )
    msg = chat(
        messages=[
            {"role": "system", "content": JUDGE_SYSTEM},
            {"role": "user", "content": user_block},
        ],
        model=OLLAMA_MAIN_MODEL,
        options={"temperature": 0.1},
        format_json=True,
    )
    raw = msg.get("content", "").strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        return {"error": f"could not parse judge JSON: {exc}", "raw": raw}


def fetch_sources_text(client: httpx.Client, case: dict) -> str:
    """Re-run search_kb via /search to get the full chunk texts (the /answer
    response only has source metadata). Used as ground-truth for the judge.
    """
    payload = {"query": case["query"], "lang": case["lang"], "k": 3}
    r = client.post("/search", json=payload, timeout=120.0)
    r.raise_for_status()
    results = r.json().get("results", [])
    return "\n\n".join(
        f"[{i+1}] ({c.get('section')} | {c.get('section_title')})\n{c.get('text','')}"
        for i, c in enumerate(results)
    )


def main() -> None:
    cases = json.loads(TEST_CASES_PATH.read_text(encoding="utf-8"))
    print(f"[info] {len(cases)} test cases, backend={BACKEND}, judge={OLLAMA_MAIN_MODEL}\n")

    records: list[dict] = []
    started = time.time()
    with httpx.Client(base_url=BACKEND, timeout=300.0) as client:
        try:
            client.get("/health").raise_for_status()
        except Exception as exc:
            print(f"[err] backend not reachable: {exc}")
            sys.exit(1)

        for i, case in enumerate(cases, start=1):
            print(progress_bar(i - 1, len(cases), time.time() - started), flush=True)
            print(f"[{i}/{len(cases)}] {case['id']}  ({case['lang']})  {case['query']}", flush=True)
            t0 = time.time()
            try:
                ans = call_answer(client, case)
            except Exception as exc:
                print(f"  [err] /answer failed: {exc}")
                records.append({"case": case, "error": str(exc)})
                continue
            dt_ans = time.time() - t0

            print(f"  answer ({dt_ans:.1f}s): {ans['answer'][:200]}{'...' if len(ans['answer'])>200 else ''}")

            try:
                src_text = fetch_sources_text(client, case)
            except Exception as exc:
                print(f"  [err] /search failed: {exc}")
                records.append({"case": case, "answer": ans, "error": f"search: {exc}"})
                continue

            t0 = time.time()
            try:
                scores = judge_one(case, ans, src_text)
            except Exception as exc:
                print(f"  [err] judge failed: {exc}")
                records.append({"case": case, "answer": ans, "error": f"judge: {exc}"})
                continue
            dt_judge = time.time() - t0

            if "error" in scores:
                print(f"  [warn] judge JSON parse fail: {scores['error']}")
            else:
                print(
                    f"  scores (judge {dt_judge:.1f}s): "
                    f"ground={scores.get('groundedness')} "
                    f"compl={scores.get('completeness')} "
                    f"tone={scores.get('tone')} "
                    f"lang={scores.get('language_compliance')} "
                    f"concis={scores.get('concision')} "
                    f"-> overall={scores.get('overall')}"
                )
                print(f"  rationale: {scores.get('rationale')}")

            anchors = check_anchors(ans.get("answer", ""), case.get("anchors") or [])
            if anchors["checked"]:
                marker = "ok" if not anchors["missing"] else "MISS"
                print(f"  anchors [{marker}]: {anchors['hits']}/{anchors['checked']}  missing={anchors['missing']}")
            print(flush=True)
            records.append({"case": case, "answer": ans, "scores": scores, "anchors": anchors})

    print(progress_bar(len(cases), len(cases), time.time() - started), flush=True)

    # Aggregate.
    valid = [r for r in records if isinstance(r.get("scores"), dict) and "error" not in r["scores"]]
    if valid:
        dims = ["groundedness", "completeness", "tone", "language_compliance", "concision", "overall"]
        avg = {d: sum(r["scores"][d] for r in valid) / len(valid) for d in dims}
        print("=" * 60)
        print(f"average scores over {len(valid)}/{len(records)} valid runs:")
        for d in dims:
            bar = "#" * int(round(avg[d]))
            print(f"  {d:22s} {avg[d]:5.2f}  {bar}")

        # Anchor coverage across cases that defined anchors.
        anchor_runs = [r for r in records if r.get("anchors", {}).get("checked", 0) > 0]
        if anchor_runs:
            total_checked = sum(r["anchors"]["checked"] for r in anchor_runs)
            total_hits = sum(r["anchors"]["hits"] for r in anchor_runs)
            print(
                f"  anchor coverage         "
                f"{total_hits}/{total_checked} = {100*total_hits/total_checked:.1f}% "
                f"(across {len(anchor_runs)} cases with anchors)"
            )
            misses = [(r["case"]["id"], r["anchors"]["missing"]) for r in anchor_runs if r["anchors"]["missing"]]
            if misses:
                print(f"  cases missing anchors:")
                for cid, miss in misses:
                    print(f"    {cid}: {miss}")
    else:
        print("[warn] no valid runs to aggregate")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = OUT_DIR / f"run_{stamp}.json"
    out_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[done] wrote {out_path}")


if __name__ == "__main__":
    main()
