# Agent service

RAG + LLM service for the EC First-Timer Assistant. Python + FastAPI, Ollama-served qwen2.5 for generation, bge-m3 for embeddings, ChromaDB for vectors, BM25 for keyword retrieval, RRF for fusion. MongoDB connector for structured data and sessions is scaffolded but not yet wired into the agent loop.

## Layout

```
agent/
├── app/
│   ├── main.py             # FastAPI entrypoint (/search, /answer, /health)
│   ├── agent/              # answerer, system prompts (RO + EN)
│   ├── db/                 # Chroma persistent client + collection accessors
│   ├── embeddings/         # Ollama bge-m3 wrapper
│   ├── lib/                # BM25 in-memory index + RRF fusion
│   ├── llm/                # Ollama chat wrapper (qwen2.5)
│   └── tools/              # search_kb (hybrid retrieval) + future agent tools
├── scripts/
│   ├── chunk_kb.py         # parses kb/kb.md into structured chunks
│   ├── translate_kb.py     # RO -> EN via small Ollama model
│   ├── embed_kb.py         # embeds RO + EN chunks into Chroma
│   ├── chroma_smoke.py     # standalone Chroma sanity test
│   ├── chat.py             # terminal REPL for /search and /answer
│   └── eval_answers.py     # eval harness with LLM judge + anchor checks
├── kb/
│   └── kb.md               # source knowledge base content (RO)
├── data/
│   ├── chroma/             # Chroma persist (gitignored)
│   ├── mock/               # staged chunk JSON (RO + EN)
│   └── eval/               # test_cases.json + timestamped run results
├── requirements.txt
├── .env.example
└── .env                    # gitignored
```

## Prerequisites

- **Python 3.10+**
- **Ollama** running locally at `http://localhost:11434` with these models pulled:
  ```powershell
  ollama pull qwen2.5:14b-instruct   # main answerer (use 7b if VRAM-constrained)
  ollama pull qwen2.5:3b-instruct    # small model for translation, future slot extraction
  ollama pull bge-m3                 # 1024-dim multilingual embeddings
  ```
- Ollama config worth setting for our workload (persist via Windows user env vars):
  ```powershell
  [Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "24h", "User")
  [Environment]::SetEnvironmentVariable("OLLAMA_MAX_LOADED_MODELS", "2", "User")
  [Environment]::SetEnvironmentVariable("OLLAMA_FLASH_ATTENTION", "1", "User")
  ```
  Then fully restart Ollama (tray quit + relaunch).

## Install

From `agent/`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# edit .env to fill in MONGODB_URI and GOOGLE_MAPS_API_KEY when you have them
```

> Note: there is also a `.venv` at the repo root from earlier development. Either reuse it (`..\.venv\Scripts\python`) or create a fresh one inside `agent/` as shown above — pick one and stay consistent.

## First-time data load

Run these from `agent/` once after install:

```powershell
.venv\Scripts\python -m scripts.chunk_kb        # produces data/mock/kb_chunks.ro.json
.venv\Scripts\python -m scripts.translate_kb    # produces data/mock/kb_chunks.en.json
.venv\Scripts\python -m scripts.embed_kb        # upserts both into Chroma
.venv\Scripts\python -m scripts.chroma_smoke    # sanity check
```

## Run the service

```powershell
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Endpoints:

- `GET /health` — checks Chroma, BM25, Ollama
- `POST /search` — hybrid retrieval, returns raw chunks
- `POST /answer` — same retrieval + LLM-generated answer with sources
- `GET /docs` — auto-generated Swagger UI

Request shape for both `/search` and `/answer`:

```json
{
  "query": "How do I get from Cluj to the festival?",
  "lang": "en",        // or "ro"
  "topic": "transport", // optional filter, see HANDOFF section 4
  "k": 3
}
```

## Try it from the terminal

```powershell
.venv\Scripts\python -m scripts.chat
```

REPL commands: `:lang ro|en`, `:topic <name>`, `:mode answer|search`, `:k <n>`, `:help`, `:quit`.

## Run the eval

```powershell
.venv\Scripts\python -u -m scripts.eval_answers
```

Generates a timestamped `data/eval/run_*.json` with per-case scores from the LLM judge + deterministic anchor coverage. Edit `data/eval/test_cases.json` to add cases.

## Frontend integration

When the frontend lands, it should call `POST /answer` for the chat/free-search experiences. The response includes the generated `answer` text plus the source chunks used (with section and topic metadata) so the UI can render citations or a "sources" tray. `low_confidence: true` means the agent didn't find a relevant chunk and refused cleanly — the UI may want to render that state differently (e.g. an offer to rephrase).

See `docs/HANDOFF.md` for the full architecture, build order, tone rules, and the essential-topics coverage map.
