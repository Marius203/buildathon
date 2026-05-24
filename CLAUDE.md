# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EC First-Timer Assistant** — an AI-powered guide for first-time Electric Castle festival attendees. Three services: a React frontend, a Python/FastAPI backend (auth + persistence), and a Python/FastAPI agent service (RAG + LLM).

## Commands

### Frontend
```bash
cd frontend
npm install
npm run dev       # Vite dev server at localhost:5173
npm run build
npm run lint
```

### Agent Service
```bash
cd agent
python -m venv .venv && .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # fill CLAUDE_API_KEY, MONGODB_URI, OLLAMA_BASE_URL (embeddings only)

# One-time data pipeline (run in order):
python -m scripts.chunk_kb       # kb/kb.md → RO chunks JSON
python -m scripts.translate_kb   # RO → EN via LLM
python -m scripts.embed_chunks   # chunks → ChromaDB (uses bge-m3 via Ollama)

# Start service:
python -m uvicorn app.main:app --reload --port 8000

# Interactive REPL:
python -m scripts.chat            # :lang ro|en, :mode answer|search

# Run LLM-judge evaluation:
python -u -m scripts.eval_answers

# Smoke test ChromaDB:
python -m scripts.chroma_smoke
```

### Backend
```bash
cd backend
python -m venv .venv && .venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Fill MONGODB_URI, JWT_SECRET in .env

python -m uvicorn app.main:app --reload --port 8001
```

### Ollama Setup (Windows, one-time — embeddings only)
```powershell
ollama pull bge-m3   # embeddings (1024-dim); only model still needed from Ollama

[Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "24h", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_FLASH_ATTENTION", "1", "User")
```

## Architecture

### Service Topology
```
Browser → Frontend (React/Vite :5173)
              ↓ POST /chat/stream  (NDJSON streaming)
         Backend (FastAPI :8001, MongoDB, JWT auth)
              ↓ POST /answer/stream
         Agent (FastAPI :8000, ChromaDB, Claude Haiku)
              ↓ embeddings only
           Ollama (bge-m3)
```

### Agent Service — Retrieval & Generation
- **Hybrid search** (`app/tools/search_kb.py`): ChromaDB vector search (bge-m3, 1024-dim) + BM25 keyword index, fused with Reciprocal Rank Fusion. Confidence threshold: `vector_distance ≥ 0.55` → model refuses cleanly via `no_context_prompt`.
- **LLM**: Claude Haiku (`claude-haiku-4-5-20251001`) via Anthropic SDK (`app/llm/claude_client.py`). Model is configurable via `CLAUDE_MODEL` env var. `app/llm/ollama_client.py` still exists but is unused for generation.
- **Answerer** (`app/agent/answerer.py`): retrieves context via `search_kb`, builds `[system, ...history, user]` message array, streams or returns response from Claude. Accepts full conversation `history: list[dict]` for multi-turn context.
- **Prompts** (`app/agent/prompts.py`): `MUST_KNOW_EN/RO` (8 proactive first-timer topics), `RESOURCE_LINKS` (5 curated URLs in `[label](url)` markdown). Rules enforce: 1-3 sentence answers, no corporate phrasing, no em dashes, proactive topic offers (once, softly).
- **Embeddings**: `app/embeddings/ollama.py` wraps bge-m3 for both ingestion and query time.
- **Persistence**: ChromaDB embedded store at `data/chroma/` (gitignored); BM25 index rebuilt in-memory on startup from `data/chunks.json`.

### Backend Service
- Auth via JWT (`app/api/routes/auth.py`); sessions, chat, and feedback stored in MongoDB via Motor async driver.
- `app/services/agent_service.py` fetches conversation history from MongoDB, then proxies to the agent's `/answer` or `/answer/stream` endpoints, passing the full history.
- MongoDB collections: `users`, `sessions`, `messages`, `events`, `feedback`.
- The frontend uses the `/chat/stream` endpoint exclusively (NDJSON); `/chat/message` (non-streaming) exists but is unused by the UI.

### Frontend
- Single-page React app with React Router. Main chat logic lives in `src/App.jsx`; `typing` state stays `true` until the **first token** arrives (not just HTTP response headers), so the loading indicator reflects actual LLM latency.
- `src/utils.js`: `formatText()` converts `**bold**` and `[label](url)` markdown to HTML (rendered via `dangerouslySetInnerHTML`). Links inside `.ec-chat__bubble--ai` are styled EC red.
- Brand styles in `src/ElectricCastle.css` (EC black `#111111` / red `#E32636` / white `#F4F4F4` palette, Oswald font). All CSS uses `--ec-*` custom properties.
- `src/components/ChatBubble.jsx`: contains `ThinkingIndicator` — cycles random catchphrases with animated dots and a pulse effect while waiting for a response.

## Key Data Contracts

**Agent `/answer`** — `POST { query, lang, topic?, k?, history: ChatMessage[] }` → `{ query, lang, topic, answer, sources, low_confidence }`

**Agent `/answer/stream`** — same request body → NDJSON: `{"token": str}` lines, final `{"done": true, "sources": [...], "low_confidence": bool}`

**Agent `/search`** — `POST { query, lang, topic?, k? }` → `{ query, lang, topic, results: [SearchHit] }`

**Backend `/chat/stream`** — `POST { session_id, message }` (JWT Bearer) → NDJSON stream (proxied from agent)

## ChromaDB Schema

Collection `kb_chunks` metadata fields: `lang` (ro|en), `source`, `section`, `section_title`, `created_at`. Topic classification was intentionally removed — chunks are filtered by `lang` only.

## Handoff Docs

`docs/HANDOFF.md` contains full architectural decisions, locked design choices, build order, and tone guidelines — read it before making significant changes to the agent or retrieval pipeline.
