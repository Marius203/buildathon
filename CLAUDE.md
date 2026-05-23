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
# All env vars live in the repo-root .env (copy ../.env.example ../.env if missing).

# One-time data pipeline (run in order):
python -m scripts.chunk_kb       # kb/kb.md → data/mock/kb_chunks.ro.json
python -m scripts.translate_kb   # RO → EN
python -m scripts.embed_kb       # chunks → ChromaDB

# Start service:
python -m uvicorn app.main:app --reload --port 8000

# Interactive REPL:
python -m scripts.chat            # :lang ro|en, :topic <>, :mode answer|search

# Run LLM-judge evaluation:
python -u -m scripts.eval_answers
```

### Backend
```bash
cd backend
python -m venv .venv && .venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Env vars (MONGODB_URI, JWT_SECRET, UPLOADTHING_*) come from the repo-root .env.

python -m uvicorn app.main:app --reload --port 8001
```

### Ollama Setup (Windows, one-time)
```powershell
ollama pull qwen2.5:14b-instruct   # main answerer
ollama pull qwen2.5:3b-instruct    # slot extraction / anonymization
ollama pull bge-m3                 # embeddings (1024-dim)

[Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "24h", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_MAX_LOADED_MODELS", "2", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_FLASH_ATTENTION", "1", "User")
```

## Architecture

### Service Topology
```
Browser → Frontend (React/Vite :5173)
              ↓ POST /chat/message
         Backend (FastAPI :8001, MongoDB, JWT auth)
              ↓ POST /answer
         Agent (FastAPI :8000, ChromaDB, Ollama)
```

### Agent Service — Retrieval & Generation
- **Hybrid search** (`app/tools/search_kb.py`): ChromaDB vector search (bge-m3, 1024-dim) + BM25 keyword index, fused with Reciprocal Rank Fusion. Confidence threshold: vector_distance ≥ 0.55 → model refuses cleanly.
- **Answerer** (`app/agent/answerer.py`): builds a system prompt from `app/agent/prompts.py`, calls `search_kb` to retrieve context, then sends to `qwen2.5:14b-instruct` via the OpenAI-compatible Ollama wrapper (`app/llm/ollama_client.py`).
- **Embeddings**: `app/embeddings/ollama.py` wraps bge-m3 for both ingestion and query time.
- **Persistence**: ChromaDB embedded store at `data/chroma/` (gitignored); BM25 index is rebuilt in-memory on startup.

### Backend Service
- Auth via JWT (`app/api/routes/auth.py`); sessions, chat, and feedback stored in MongoDB via Motor async driver.
- `app/services/agent_service.py` proxies to the agent service at `http://localhost:8000`: `get_agent_response` calls `POST /answer`; `stream_agent_response` proxies `POST /answer/stream` line-by-line. Both degrade gracefully when the agent is down.
- MongoDB collections: `users`, `sessions`, `messages`, `events`, `feedback`.

### Frontend
- Single-page React app (`src/App.jsx`): hero section, chat bubble, EC info cards, stages grid.
- Brand styles in `src/ElectricCastle.css` (EC black/red/white palette, Oswald font).
- Calls `backend /chat/message`, which forwards to the agent's `/answer` endpoint (integration is live).

## Key Data Contracts

**Agent `/answer`** — `POST { query, lang, topic?, k? }` → `{ query, lang, topic, answer, sources, low_confidence }`

**Agent `/search`** — `POST { query, lang, topic?, k? }` → `{ query, lang, topic, results: [SearchHit] }`

**Backend `/chat/message`** — `POST { session_id, message }` (JWT Bearer) → `{ session_id, user_message, agent_response }`

## ChromaDB Schema

Collection `kb_chunks` metadata fields: `lang` (ro|en), `topic` (transport|accommodation|weather|tickets|lineup|rules), `source`, `section`, `section_title`, `created_at`.

## Essential Topics Coverage

The agent surfaces 10 must-know items for first-timers (defined in `app/agent/prompts.py` and the MongoDB `essential_topics` collection): shuttle vs. driving, cashless wristband, rain gear, footwear, early accommodation booking, ticket types, late set-time drops, multi-stage strategy, meeting points + power bank, allowed/forbidden items.

## Handoff Docs

`docs/HANDOFF.md` contains the full architectural decisions, locked design choices, build order, and tone guidelines — read it before making significant changes to the agent or retrieval pipeline.
