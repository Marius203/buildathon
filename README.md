# EC First-Timer Assistant

Hackathon project for the AI Builder Challenge — Electric Castle "First Time at the Castle". A festival assistant that helps first-timers plan their first EC trip, with three entry points (free search, chat, guided planner), bilingual (RO + EN), and an emphasis on the "friend who's been there" tone over corporate chatbot energy.

## Repo layout

```
buildathon/
├── agent/         # RAG + LLM service (Python, FastAPI, Ollama, Chroma)
├── backend/       # services backend (placeholder — owned by teammate)
├── frontend/      # UI (placeholder — owned by teammate)
└── docs/          # project docs incl. HANDOFF.md
```

Each top-level service has its own README with run instructions.

## Where to start

- **Project context & decisions**: [docs/HANDOFF.md](docs/HANDOFF.md)
- **Running the AI service locally**: [agent/README.md](agent/README.md)
- **Frontend integration**: agent exposes `POST /search` and `POST /answer`; full schema lives in agent's FastAPI auto-docs at `http://127.0.0.1:8000/docs`

## Status

The agent service is functional end-to-end: chunks the KB, embeds with bge-m3 (multilingual), retrieves via Chroma + BM25 hybrid with RRF fusion, and answers via Ollama-served qwen2.5. The agent loop with tool calling, session persistence (Mongo), and the essential-topics surfacing logic are next per the HANDOFF roadmap.

Frontend and backend slots are empty placeholders waiting for teammate code.
