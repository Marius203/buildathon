# EC First-Timer Assistant

An AI-powered, bilingual (Romanian + English) companion for first-time **Electric Castle** festival attendees. It speaks like a friend who has been to EC a dozen times, not like a corporate chatbot. Ask it anything about getting to the festival, the cashless wristband, the camping, the lineup, prohibited items, safety, rules for minors, food, weather, packing, and it answers in 1–3 short sentences grounded in a curated knowledge base, with sources.

The project is a full three-tier stack: a React + Vite frontend, a FastAPI persistence/auth backend on MongoDB, and a separate FastAPI RAG agent that does hybrid retrieval over a ChromaDB + BM25 index and generates with Claude Haiku. Everything streams token-by-token end-to-end.

---

## Repository layout

```
buildathon/
├── agent/                        # RAG + LLM service — FastAPI, ChromaDB, Claude
│   ├── app/
│   │   ├── main.py               # /health, /search, /answer, /answer/stream, /ingest
│   │   ├── agent/                # answerer + bilingual system prompts
│   │   ├── db/chroma.py          # Chroma persistent client + kb_chunks collection
│   │   ├── embeddings/ollama.py  # bge-m3 wrapper for query + ingestion embeddings
│   │   ├── lib/bm25_index.py     # in-memory BM25 index, one per language
│   │   ├── lib/rrf.py            # Reciprocal Rank Fusion
│   │   ├── llm/claude_client.py  # Anthropic SDK wrapper (sync + async streaming)
│   │   ├── llm/ollama_client.py  # legacy local LLM wrapper (unused for generation)
│   │   ├── services/ingest_service.py  # chunk + embed user uploads
│   │   └── tools/search_kb.py    # hybrid retrieval with low-confidence cutoff
│   ├── scripts/                  # chunk_kb, translate_kb, embed_chunks, chat REPL, eval
│   ├── kb/kb.md                  # source knowledge base (Romanian)
│   └── data/                     # chunks.json, chroma/ (gitignored), eval runs
├── backend/                      # Auth + persistence service — FastAPI + Motor (MongoDB)
│   ├── app/
│   │   ├── main.py               # FastAPI app, CORS, lifespan-managed Mongo
│   │   ├── api/routes/auth.py    # /auth/register, /auth/login, /auth/make-admin
│   │   ├── api/routes/chat.py    # /chat/message, /chat/stream, /chat/history
│   │   ├── api/routes/admin.py   # stats, unanswered, broadcasts, KB upload, favorites
│   │   ├── api/routes/feedback.py
│   │   ├── core/security.py      # bcrypt password hashing + JWT issuance
│   │   ├── db/mongodb.py         # async Motor client lifecycle
│   │   ├── db/repositories/      # chat / user / stats persistence
│   │   ├── services/agent_service.py  # proxies user turns to the agent with history
│   │   └── services/kb_service.py     # extracts text from PDF/DOCX/TXT, ships to agent
│   └── uploads/
├── frontend/                     # React 19 + Vite + React Router SPA
│   ├── src/
│   │   ├── App.jsx               # chat shell, streaming reader, notif polling
│   │   ├── pages/HomePage.jsx    # marketing landing with reveal-on-scroll
│   │   ├── pages/GuidePage.jsx   # the deep first-timer guide (transport, food, etc.)
│   │   ├── pages/PlannerPage.jsx # guided 6-step planner
│   │   ├── pages/FaqPage.jsx     # categorised FAQ
│   │   ├── components/ChatBubble.jsx   # floating chat with ThinkingIndicator
│   │   ├── components/NavBar.jsx + NotifPanel + AuthModal + AdminPanel
│   │   ├── ElectricCastle.css    # brand tokens (EC red/black, Oswald)
│   │   ├── api.js + utils.js     # auth header helpers, session id, format helpers
│   │   └── MockBackend.js
├── docs/HANDOFF.md               # architectural decisions, build order, tone rules
├── docker-compose.yml            # agent + backend + frontend (nginx) wired together
├── Dockerfile.agent / .backend / .frontend
├── nginx.conf                    # frontend container reverse proxy config
├── dev.ps1                       # one-shot dev launcher (Windows)
└── CLAUDE.md                     # Claude Code project instructions
```

---

## What the project does, end-to-end

### 1. A festival assistant with three entry points, one brain
Per the original brief (see `docs/HANDOFF.md`) the product supports three ways for a first-timer to get help, all driven by the same agent underneath:

1. **Free chat** — a floating chat bubble (always reachable from any page) with a single text input. Users can ask anything in Romanian or English and get a streamed answer in the same language.
2. **Guided planner** — a 6-step wizard (`/planner`) that gathers persona signals: first-timer or veteran, origin (Cluj / elsewhere in RO / abroad), number of days, group type (solo / couple / friends / family), accommodation (own tent / glamping / hotel) and music taste (mainstream / electronic / alternative / discovery). The planner is designed to hand off into the chat with a personalised plan.
3. **Curated guide pages** — a hand-crafted **Guide** page (`/guide`) with the train schedule from Gara Mică, accommodation matrices, packing list, food highlights, cashless onboarding steps, and a categorised **FAQ** page (`/faq`) covering tickets, transport, camping, festival area, cashless, food & drinks, safety, weather, lineup.

Every page also exposes the same chat bubble; the Home page's topic cards seed the chat with a contextual prompt (e.g. "Aș vrea să aflu mai multe detalii despre transport").

### 2. Bilingual by design (RO + EN), not auto-detected
Language is an explicit toggle that the frontend passes on every request. The agent uses it three ways:

- as a `lang` metadata filter on the Chroma query so it only retrieves chunks in the requested language,
- as a switch between two complete system prompts (`ANSWERER_RO` / `ANSWERER_EN`) that include their own style examples and tone guardrails,
- as a switch between two MUST-KNOW topic packs so proactive offers are written natively in the user's language.

### 3. Hybrid retrieval over a real Electric Castle knowledge base
The agent service builds a knowledge base from `agent/kb/kb.md` (the original Romanian source). The build pipeline is three scripts run in order:

1. **`scripts.chunk_kb`** — parses the markdown into structured chunks with `section`, `section_title`, and `source` metadata.
2. **`scripts.translate_kb`** — LLM-translates the Romanian chunks into English so both languages share the same corpus shape.
3. **`scripts.embed_chunks`** — calls Ollama's `bge-m3` (1024-dim, multilingual) to embed each chunk and upserts into a persistent ChromaDB collection `kb_chunks` with `lang`, `source`, `section`, `section_title`, `created_at` metadata.

At query time **two retrievers run in parallel** and are fused with Reciprocal Rank Fusion (`agent/app/lib/rrf.py`):

- **Vector search** through ChromaDB using the same bge-m3 model on the user's question, filtered by `lang`.
- **BM25 keyword search** through an in-memory `rank_bm25` index built per-language at startup from the same Chroma corpus (rebuilt in-process whenever a new document is ingested).

The top `k` fused hits are then handed to the LLM. The default candidate pool is `CANDIDATE_K = 20`, default returned `DEFAULT_K = 10`. The fusion guarantees that pure semantic matches and exact-keyword matches (e.g. "Gara Mică", "Iulius Mall", "35 lei") both surface.

### 4. Low-confidence detection — the model refuses cleanly instead of hallucinating
If the top vector distance from ChromaDB is `≥ 0.55` (`LOW_CONFIDENCE_DISTANCE`), retrieval is considered out-of-domain. The answerer swaps to a special `ANSWERER_NO_CONTEXT_*` prompt that:

- tells the user, in one short sentence, that the knowledge base does not cover the question, and
- if the question is about the lineup, falls back to a hard-coded `HEADLINERS` block that contains 2025-season headliners per day (Thu: KNEECAP, BALU BRIGADA, SLEAFORD MODS, Sullivan King; Fri: TWENTY ONE PILOTS, TEDDY SWIMS, MOCHAKK, SKREAM & BENGA, SUBTRONICS, KÖLSCH; Sat: CHASE & STATUS, LP, NOTHING BUT THIEVES, DEEP DISH, YUNG LEAN & BLADEE; Sun: THE CURE, WET LEG, DOGSTAR; Camping Opening Jul 15: WILKINSON; plus NASTIA).

The agent's response payload always includes a `low_confidence: bool` flag so the UI and the backend can react (the backend uses it to mark the user's question as "unanswered" in MongoDB, see § 7).

### 5. Proactive must-know coverage — the "friend who's been there" behaviour
The agent's system prompt embeds a MUST-KNOW block (`MUST_KNOW_EN` / `MUST_KNOW_RO`) listing the eight topics every first-timer must learn about, each with a precise one-shot offer line. The model is instructed to answer the user's actual question first, then *once*, *softly*, offer to expand on the relevant must-know topic. The same topic is never offered twice within a conversation, and only one offer is appended per turn. The covered topics are:

- **Ticket personalization** — name + photo required; free within 7 days of purchase, then 30 € until May 31, 50 € in June/July.
- **Cashless wristband** — all on-site payments are cashless; top up online or at on-site points; activate by scanning at any bar or vendor.
- **Getting there** — EC trains from Gara Mică (35 lei) or non-stop buses from Iulius Mall / Expo Transilvania (35 lei).
- **Pre-swap** — swap bilet for wristband at Iulius Mall / Promenada / AFI Cotroceni before the festival to skip the entrance queue (not for day tickets).
- **Prohibited items** — no umbrellas, no outside alcohol, no glass, no food/drinks brought in.
- **Camping / EC Village** — needs a separate Camping Pass; opens July 15 at 12:00.
- **Safety** — Red Team across the festival, safety line +40 741 069 443, "Angel Shot" at any bar for discreet help.
- **Minors** — under 16 needs a parent or guardian present; 16–17 needs a signed parental statement.

The prompts also ship curated **resource links** the model can render inline as `[label](url)` markdown when genuinely useful: the EC tickets page, the main electriccastle.com site, the cashless platform, the EC App on iOS/Android, and ginfospot.ro for safety/health.

### 6. Streaming token-by-token, all the way through
Both the agent and the backend speak **NDJSON streaming**. Each line is a JSON object:

- `{"token": "..."}` during generation,
- a final `{"done": true, "sources": [...], "low_confidence": false}` event.

The agent uses the Anthropic SDK's `messages.stream` (sync and async), and the backend re-emits the stream verbatim from `/chat/stream` so the React app shows tokens as they land. The frontend keeps the `typing` indicator state alive until the **first token** arrives, not just until HTTP headers come back, so the "thinking" animation reflects actual LLM latency.

### 7. Persistent multi-turn conversations with authentication
The backend wraps the agent with auth, sessions, and history.

- **Registration & login** (`/auth/register`, `/auth/login`) — bcrypt-hashed passwords (`passlib`), JWT access tokens (`python-jose`).
- **JWT-protected chat** — `/chat/message` (non-streaming) and `/chat/stream` (NDJSON) both require `Authorization: Bearer ...`. The frontend uses `/chat/stream` exclusively.
- **Conversation persistence** — every user and assistant message is appended to a single MongoDB document keyed by `session_id` in the `conversations` collection, with `created_at`, `updated_at`, `user_email`, and per-message `timestamp`, `feedback`, `answered`, and (for admin replies) `from_admin` flags.
- **History injection** — before proxying to the agent, the backend reads the full conversation from MongoDB and ships it as the `history` parameter so the agent gets real multi-turn context.
- **`answered` flag** — when the agent reports `low_confidence: true`, the backend rewrites the user's last message in MongoDB to `answered: false`. This drives the admin "Unanswered" queue.

### 8. Per-message feedback
Users can rate any AI response thumbs-up / thumbs-down. The frontend calls `POST /admin/feedback` with `session_id`, `message_index`, and `helpful: true|false`; the backend stores the flag on that specific assistant message inside the conversation document. The aggregate is rolled up in the admin dashboard.

### 9. Admin dashboard
A logged-in admin user (set via `/auth/make-admin/{email}`) gets the **AdminPanel** modal in the SPA. It is divided into five tabs:

- **📊 Dashboard / Stats** — total conversations, conversations today, total user messages, total users / users today, total feedback (positive / negative), an hourly bar chart of the last 24 hours (`/admin/stats/hourly`), the all-time peak hour of activity (`/admin/stats/peak-hours`), and the popular question categories detected from message content (`/admin/stats/categories`, with keyword buckets for **transport**, **cazare**, **buget**, **vreme**, **muzica**, **acces**, **altele**). Stats are exportable to CSV via `/admin/stats/export`.
- **⭐ Favorites** — admins can pin frequent questions as suggested prompts; the backend also surfaces unprompted suggestions (`/admin/favorites/suggestions`) by aggregating user questions that appear three or more times.
- **⚠️ Unanswered** — surfaces messages where the agent flagged `low_confidence: true`, **grouped by content** so admins reply once and the answer fans out to every session that asked the same thing. Replies become an assistant message with `from_admin: true` in each affected conversation and also create a per-user **notification**.
- **📁 Upload** — admins can upload a **PDF**, **DOCX**, or **image** through `/admin/kb/upload`. PDFs and DOCX files are text-extracted (`pypdf` / `python-docx`), shipped to the agent's `/ingest` endpoint, chunked into 400-char overlapping windows (80-char overlap), embedded with bge-m3, upserted into ChromaDB, and the BM25 index is rebuilt in-process so new documents are immediately searchable. The original file is mirrored to Uploadthing for serving back to the UI.
- **📢 Broadcast** — admins can send a freeform message to every registered user; broadcast history is queryable.

There is also a categorised view of **unanswered themes** (`/admin/stats/unanswered-themes`) that buckets the unresolved questions into the same six categories so admins can see at a glance whether the assistant is, say, weak on transport vs. cashless.

### 10. Notifications & user inbox
The frontend polls `/admin/notifications` every 10 seconds while a user is logged in and shows unread badges on the bell icon. There are two kinds of notifications:

- **Admin reply notifications** — when an admin answers an "unanswered" question, every user who asked that exact question receives a notification linking the original question to the new answer.
- **Broadcasts** — when an admin sends a broadcast, every user gets a notification with the message.

Clicking a notification opens a styled modal that distinguishes the two cases. Notifications are marked read via `PATCH /admin/notifications/{id}/read`.

### 11. Curated content pages (no AI needed for these)
The frontend ships static, hand-tuned content as first-class pages so users have ground truth without burning LLM calls:

- **Home** (`/`) — hero with EC branding, an animated infinite marquee, topic cards (Transport, Cazare, Muzică, Vreme) that seed the chat, reveal-on-scroll animations, and the floating chat bubble.
- **Guide** (`/guide`) — full first-timer guide with: the EC train timetable from Gara Mică for every festival day, transport points with Google Maps deep-links to Gara Mică / Iulius Mall / Expo Transilvania, an accommodation comparison (camping / glamping / hotel Cluj) with pros, cons, indicative prices, and tips, a 13-item packing list categorised as must / recommended / optional, eight curated food highlights with location tags, and a four-step cashless onboarding walkthrough.
- **FAQ** (`/faq`) — categorised FAQ with sections for tickets & access, transport, accommodation & camping, festival area, cashless & payments, food & drinks (and more), with concrete details from official EC sources.
- **Planner** (`/planner`) — six-step wizard with a live answer summary, progress bar, persona-aware option descriptions.

### 12. Cross-cutting tone & formatting rules
The agent's prompts enforce a strict, repeatable house style — no markdown headers in chat answers, no em dashes (the `--` character — replaced with commas, colons, periods), direct address ("you" / "tu"), 1–3 sentence answers by default (lists only when explicitly asked), no corporate phrasing ("for your convenience", "official transportation options"), and verbatim use of proper names and numbers from the retrieved context ("Gara Mică" never "Cluj's small train station"; "35 lei" never "a small fee"). The frontend mirrors this with a `formatText()` helper that renders `**bold**` and `[label](url)` markdown safely.

---

## Public HTTP surface

### Agent service (default `http://localhost:8000`)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Component-level health: ChromaDB chunk count, BM25 indices per language, Ollama model list. Returns `status: ok|degraded`. |
| `POST` | `/search` | Hybrid retrieval only. Returns `results: SearchHit[]` with `id`, `score`, `vector_distance`, `text`, `topic`, `section`, `section_title`, `source`, `lang`. |
| `POST` | `/answer` | Retrieval + Claude generation (non-streaming). Returns `answer`, `sources`, `low_confidence`. |
| `POST` | `/answer/stream` | Same as `/answer` but NDJSON streamed `{"token": ...}` lines, ending with `{"done": true, "sources": [...], "low_confidence": bool}`. |
| `POST` | `/ingest` | `{ text, filename, lang }` → chunks, embeds, upserts into Chroma and rebuilds BM25. |
| `GET` | `/docs` | FastAPI Swagger UI. |

`/answer` and `/answer/stream` request body:

```json
{
  "query": "How do I get from Cluj to the festival?",
  "lang": "en",
  "topic": null,
  "k": 3,
  "history": [
    {"role": "user", "content": "What's the wristband?"},
    {"role": "assistant", "content": "Your wristband is your wallet inside..."}
  ]
}
```

### Backend service (default `http://localhost:8001`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create user, returns JWT. |
| `POST` | `/auth/login` | — | Returns JWT. |
| `POST` | `/auth/make-admin/{email}` | admin | Promote a user to admin. |
| `POST` | `/chat/message` | user | Non-streaming chat (exists but unused by the UI). |
| `POST` | `/chat/stream` | user | NDJSON-streamed chat — the primary route the SPA uses. |
| `GET` | `/chat/history/{session_id}` | user | Full message log for a session. |
| `POST` | `/feedback/{message_id}` | user | Thumbs up/down feedback by Mongo `ObjectId`. |
| `POST` | `/admin/feedback` | user | Thumbs up/down feedback by `(session_id, message_index)` — the route the SPA uses. |
| `GET` | `/admin/stats` | admin | Conversation, message, user, feedback totals. |
| `GET` | `/admin/stats/hourly` | admin | Last-24h hourly histogram. |
| `GET` | `/admin/stats/peak-hours` | admin | All-time hourly distribution + peak hour. |
| `GET` | `/admin/stats/categories` | admin | Question topic distribution (keyword-bucketed). |
| `GET` | `/admin/stats/unanswered-themes` | admin | Same bucketing applied to unanswered messages. |
| `GET` | `/admin/stats/export` | admin | CSV export of every user message. |
| `GET` | `/admin/unanswered` | admin | Grouped queue of low-confidence questions. |
| `POST` | `/admin/unanswered/reply` | admin | Fan-out reply to all sessions that asked the same thing. |
| `GET` | `/admin/notifications` | user | Per-user inbox. |
| `PATCH` | `/admin/notifications/{id}/read` | user | Mark notification read. |
| `POST` | `/admin/broadcast` | admin | Send notification to every user. |
| `GET` | `/admin/broadcast/history` | admin | Recent broadcasts with delivery counts. |
| `GET` | `/admin/favorites` | admin | Pinned-question list. |
| `POST` | `/admin/favorites` | admin | Pin a question. |
| `DELETE` | `/admin/favorites/{id}` | admin | Unpin. |
| `GET` | `/admin/favorites/suggestions` | admin | Auto-suggested favourites (asked ≥ 3 times, not already pinned). |
| `POST` | `/admin/kb/upload` | admin | Upload PDF or image to the knowledge base. PDFs are extracted and ingested into the agent; images are stored on Uploadthing. |

CORS is permissive for `http://localhost:5173`, `:5174`, and `:80`.

### MongoDB collections used

`users` (email, `password_hash`, `is_admin`, `created_at`), `conversations` (`session_id`, `user_email`, `messages[]`, `created_at`, `updated_at`), `notifications` (per-user inbox, supports `is_broadcast`), `favorites`, `uploads` (mirror of admin-uploaded KB files).

---

## Tech stack

**Frontend** — React 19, React Router 7, Vite 8, Tailwind 4. Single-page app with a floating chat bubble that streams NDJSON straight from the backend. Brand styling via `--ec-*` CSS custom properties (EC red `#E32636`, EC black `#111111`, EC paper `#F4F4F4`, Oswald typeface).

**Backend** — FastAPI, Uvicorn, Motor (async MongoDB), Pydantic v2, passlib + bcrypt, python-jose for JWT, pypdf and python-docx for KB extraction, httpx for fan-out to the agent.

**Agent** — FastAPI, Uvicorn, Anthropic SDK (Claude Haiku 4.5, model id `claude-haiku-4-5-20251001`, configurable via `CLAUDE_MODEL`), ChromaDB embedded persistent client, `rank-bm25`, httpx, python-dotenv, and Ollama (only for the bge-m3 embedding model — generation moved off Ollama).

**Containerisation** — `docker-compose.yml` wires the three services together. The agent reaches Ollama on the host through `host.docker.internal`; the backend reaches the agent over the compose network at `http://agent:8000`; the frontend container serves the built SPA through nginx on port 80.

---

## Running locally

### Quickest path on Windows
There is a `dev.ps1` script at the repo root that launches all three services together.

### Manual (three terminals)

**1) Agent service**

```powershell
cd agent
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # fill CLAUDE_API_KEY, MONGODB_URI, OLLAMA_BASE_URL

# one-time data load (re-run after editing kb/kb.md):
python -m scripts.chunk_kb
python -m scripts.translate_kb
python -m scripts.embed_chunks
python -m scripts.chroma_smoke   # sanity check

python -m uvicorn app.main:app --reload --port 8000
```

**2) Backend service**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# fill MONGODB_URI, JWT_SECRET, UPLOADTHING_* in .env
python -m uvicorn app.main:app --reload --port 8001
```

**3) Frontend**

```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173
```

### Ollama (one-time, embeddings only)

```powershell
ollama pull bge-m3
[Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE",   "24h", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_FLASH_ATTENTION", "1", "User")
```

### Docker Compose

```powershell
docker compose up --build
# frontend on :80, backend on :8001, agent on :8000
```

---

## Developer tooling inside the agent

- **`python -m scripts.chat`** — terminal REPL against the agent. Commands: `:lang ro|en`, `:topic <name>`, `:mode answer|search`, `:k <n>`, `:help`, `:quit`. Great for iterating on prompts without the UI in the way.
- **`python -m scripts.eval_answers`** — LLM-judge evaluation harness. Reads `data/eval/test_cases.json`, calls the agent for each case, scores answers with both an LLM judge and deterministic anchor coverage checks, and writes a timestamped `data/eval/run_*.json`.
- **`python -m scripts.chroma_smoke`** — minimal ChromaDB sanity test.
- **`python -m scripts.ingest_docs`** — bulk ingestion from a directory.

---

## Key data contracts at a glance

```text
Agent /answer/stream  →  NDJSON
   { "token": "..." }
   { "token": "..." }
   ...
   { "done": true, "sources": [...], "low_confidence": false }

Agent SearchHit
   { id, score, vector_distance, text, topic, section, section_title, source, lang }

Backend /chat/stream  →  proxies agent NDJSON verbatim, requires JWT,
                         injects MongoDB history before forwarding,
                         persists every token-aggregated assistant turn
                         and flips `answered = false` on low_confidence.
```

---

## Where to read next

- **`docs/HANDOFF.md`** — locked architectural decisions, build order, tone rules, the original "three entry points / one agent" brief, and the must-know coverage map. Read this before changing the retrieval pipeline or the agent prompts.
- **`CLAUDE.md`** — the in-repo project instructions used by AI coding assistants.
- **`agent/README.md`** — focused agent service runbook with the ChromaDB schema and request shapes.
- **`agent/app/agent/prompts.py`** — the actual production system prompts, MUST-KNOW topic list, and resource links. The single highest-leverage file in the repo for changing behaviour.
