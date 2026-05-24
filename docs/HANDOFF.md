# EC First-Timer Assistant — RAG & Agent Backend Handoff

> Handoff doc for picking this up in VSCode (Claude Code). Read this top to bottom before writing any code. Everything decided here is locked unless explicitly revisited.

---

## 1. Context

**Challenge**: AI Builder Challenge — Electric Castle "First Time at the Castle." Build a first-timer assistant that helps someone who has never been to EC plan their first time at the festival. The full brief lives in the challenge document; the key facts:

- Three entry points, **one agent underneath**:
  1. **Free search** — single search box, any topic/question/worry
  2. **Chat mode** — conversational, follow-ups, natural
  3. **Guided planner** — 4-5 questions then a generated personalized plan
- Must work in **Romanian and English** (explicit toggle, not auto-detect)
- Tone: "friend who's already been to EC," not "tax office chatbot with a festival hat"
- Should also output a **shareable plan** for group chats (WhatsApp-ready text)
- Must collect **anonymized insights** about what people ask / what blocks them

**My scope (this repo)**: the agentic + RAG backend. A separate teammate is building a mock frontend that will call this backend.

**Out of scope**: frontend UI, real EC content ingestion (we mock data for the demo; real content gets swapped in later from EC's curated knowledge base).

---

## 2. Locked Decisions

### Backend
- **Python + FastAPI** + Uvicorn
- **Pydantic v2** for tool schemas + request/response validation
- Async throughout (`motor` for Mongo, `httpx` for outbound HTTP, `chromadb` async client)

### LLM — Ollama (local, no API keys needed)
- **Main agent**: `qwen2.5:14b-instruct` — best open-weight model for tool calling right now, handles Romanian decently. Fallback: `qwen2.5:7b-instruct` on weaker hardware.
- **Cheap subroutine model** (slot extraction, query rewriting, anonymization, intent classification): `qwen2.5:3b-instruct` (or `llama3.2:3b-instruct`).
- Talk to Ollama via its **OpenAI-compatible endpoint** at `http://localhost:11434/v1`. Use the `openai` Python SDK pointed at that base URL — tool-calling JSON contract is identical to OpenAI's.
- Tool-use loop is hand-rolled (~50 lines). No LangChain, no LlamaIndex.

```
ollama pull qwen2.5:14b-instruct
ollama pull qwen2.5:3b-instruct
ollama pull bge-m3
```

### Embeddings — Ollama
- **`bge-m3`** (1024 dims) — genuinely multilingual, handles Romanian well. Critical for RO+EN parity.
- Call via Ollama's `/api/embeddings` endpoint.
- Easy to swap later (e.g. to Voyage) — embedding generation is isolated in `embeddings/ollama.py`.

### Storage — split: Chroma + Mongo
- **ChromaDB (local persistent)** owns all embeddings and the unstructured `kb_chunks` corpus. Runs embedded (`chromadb.PersistentClient`) — no separate server process for the demo.
- **MongoDB** owns structured data: `lineup`, `stages`, `accommodations`, `ticket_types`, `essential_topics`, `sessions`, `events`, `personas`. The agent queries these deterministically via tools, not via fuzzy semantic search.
- **Hybrid retrieval** over `kb_chunks`: Chroma vector search + BM25 (via `rank_bm25` over the same chunk corpus, in-memory index rebuilt on startup), fused with Reciprocal Rank Fusion (RRF). Both queries run in parallel.

### Language Handling
- Every request includes `lang: "ro" | "en"` (set by the frontend toggle)
- Used as:
  - Metadata filter on Chroma `kb_chunks` retrieval
  - Injected into system prompt ("respond in Romanian"/"respond in English")
  - Tone-shifting: Romanian replies should feel native, not translated

### Env / placeholders (no real keys yet)
`.env.example`:
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MAIN_MODEL=qwen2.5:14b-instruct
OLLAMA_SMALL_MODEL=qwen2.5:3b-instruct
OLLAMA_EMBED_MODEL=bge-m3

MONGODB_URI=PLACEHOLDER_MONGO_URI
MONGODB_DB=ec_assistant

CHROMA_PERSIST_DIR=./data/chroma

GOOGLE_MAPS_API_KEY=PLACEHOLDER_MAPS_KEY
```

---

## 3. Data Schemas

### Chroma collection — `kb_chunks` (unstructured "wisdom" content)
One Chroma collection, persistent. Each document:
```py
{
  "id": str,                   # uuid
  "document": str,             # chunk text (what gets embedded)
  "embedding": [float] * 1024, # bge-m3
  "metadata": {
    "lang": "ro" | "en",
    "topic": str,              # "transport" | "accommodation" | "weather" | "tickets" | "lineup" | "rules" | "tone" | ...
    "source": str,             # e.g. "ec_faq_2024" | "mock_seed" | "tone_guidelines"
    "tags": str,               # comma-joined (Chroma metadata values must be scalar)
    "created_at": str          # ISO 8601
  }
}
```
Retrieval: `collection.query(query_embeddings=[...], n_results=k, where={"lang": lang, "topic": topic?})`.

BM25 index is built in-process from the same documents at startup (and on seed/embed) so vector + keyword agree on the corpus.

### Mongo: `lineup` — structured artist data
```js
{
  _id, artist, stage,
  day: "thursday" | "friday" | "saturday" | "sunday",
  start_time: String | null,       // null until set times drop
  mood_tags: [String],             // ["party", "mainstream", "electronic", "live", "rock", "trap", "chill", "discovery", "singalong"]
  description_en, description_ro
}
```

### Mongo: `stages`
```js
{ _id, name, vibe_tags: [String], description_en, description_ro, sample_artists: [String] }
```

### Mongo: `accommodations`
```js
{
  _id,
  type: "camping" | "glamping" | "cluj_hotel" | "bontida_pension" | "airbnb_cluj",
  pros_en: [String], pros_ro: [String],
  cons_en: [String], cons_ro: [String],
  price_range_eur: { min: Number, max: Number, unit: "per_night" | "per_festival" },
  distance_to_venue: String,
  notes: String
}
```

### Mongo: `ticket_types`
```js
{
  _id,
  name: String,
  price_eur: Number,
  includes: [String],
  notes_en: String, notes_ro: String
}
```

### Mongo: `essential_topics` — coverage map
```js
{
  _id,
  topic_id: String,
  title_en, title_ro,
  one_liner_en, one_liner_ro,
  full_text_en, full_text_ro,
  surface_priority: Number,        // 1 = highest
  surface_triggers: [String]
}
```
See section 4 for the seeded 10 items.

### Mongo: `sessions`
```js
{
  _id,                             // session_id
  lang: "ro" | "en",
  profile: {
    origin, group_size, days, accommodation_pref,
    music_taste: [String],         // mood_tags
    top_stressor,                  // "transport" | "budget" | "weather" | "camping" | "lineup" | "group"
    age_band, arrival_day
  },
  covered_topics: [String],        // topic_ids of essential_topics already surfaced
  messages: [{ role, content, ts }],
  created_at, updated_at
}
```

### Mongo: `events` — anonymized insights log
```js
{
  _id,
  session_id_hash: String,         // sha256, never raw
  query: String,                   // anonymized by small model
  intent: String,
  lang: "ro" | "en",
  topic_hit: String | null,
  ts: ISODate
}
```

### Mongo: `personas`
Loaded later when EC delivers the pack. Schema TBD; treat as `{ name, archetype, profile, top_stressors, sample_questions }`.

---

## 4. Essential-Info Coverage Map (mock — 10 items)

Seed `essential_topics` with these. They're the things every first-timer needs to leave the conversation knowing. The agent tracks `sessions.covered_topics` and surfaces uncovered items at natural moments (after an answer, transitioning topics, before generating a final plan) — **not all at once**, one or two at a time, framed as "by the way."

| topic_id | title | core message |
|---|---|---|
| `shuttle_over_driving` | Take the shuttle, don't drive | Cluj→Bonțida shuttle is the low-stress move. Driving + parking near venue is the panic path. |
| `wristband_cashless` | Wristband + cashless top-up | Ticket exchanges for a wristband. All spending is cashless on the wristband. Top up online beforehand or at booths. |
| `pack_for_rain_always` | Pack for rain regardless of forecast | EC has a mud reputation. Even if the forecast is clear, bring a rain jacket. Non-optional. |
| `proper_footwear` | Footwear matters | Closed shoes / boots you don't love. Not white sneakers, not sandals. Trust this. |
| `book_accommodation_early` | Book accommodation early | Cluj hotels and Airbnbs fill out months ahead. Decide camping / glamping / Cluj early. |
| `ticket_type_choice` | Pick your ticket type | General pass vs day ticket vs camping add-on vs VIP. Prices rise as the festival approaches — earlier is cheaper. |
| `set_times_drop_late` | Set times come out late | Exact stage schedule isn't usually published until ~1-2 weeks out. Plan moods, not minutes. |
| `multi_stage_strategy` | You can't see everyone | Pick 2-3 anchor sets per night, accept the FOMO, discover the rest by wandering between stages. |
| `meeting_point_and_battery` | Signal will die, plan for it | Agree on a fixed backup meeting spot with your group. Bring a power bank. |
| `allowed_forbidden_items` | Cheat-sheet on what you can bring | Bag size limits, no glass, no pro cameras, etc. Don't get stuck at the gate. |

**Surfacing rule** (in the agent's system prompt):
> After answering the user's question, glance at `covered_topics`. If a relevant essential topic is uncovered AND the current conversation has a natural bridge to it, surface it in one short sentence using "by the way" framing. Max one per turn. Never list multiple. Never say "here are 5 things you should know."

---

## 5. Agent Tools

All tools defined as Pydantic models, exposed to the model via the OpenAI-compatible tool-calling JSON schema (Ollama supports this for qwen2.5).

| tool | input | purpose |
|---|---|---|
| `search_kb` | `{ query, lang, topic?, k? }` | Hybrid retrieval over Chroma `kb_chunks`. Vector + BM25, RRF fusion. Returns top-k chunks with source. |
| `query_lineup` | `{ mood_tags?, stage?, day? }` | Structured Mongo query over `lineup`. Used when user asks about artists/stages/days. |
| `recommend_artists` | `{ taste_description, lang }` | Small-model-powered: turns "party / mainstream" into `mood_tags`, then calls `query_lineup`. |
| `get_stages` | `{ vibe_tags?, lang }` | Returns stage descriptions matching vibe. |
| `estimate_budget` | `{ profile }` | Deterministic calculator. Returns `{ ticket, transport, accommodation, food_drink, chaos_fund, total }` ranges in EUR. |
| `build_packing_list` | `{ scenario, lang }` | Scenario = "rain" / "sun" / "cold" / "default". Pulls from `kb_chunks` + a static base list. |
| `get_directions` | `{ from, to, mode }` | Google Maps API call (placeholder key for now — tool returns a stub until the real key lands). |
| `update_profile` | `{ session_id, slots }` | Merges extracted slots into `sessions.profile`. |
| `mark_topics_covered` | `{ session_id, topic_ids }` | Appends to `sessions.covered_topics`. |
| `get_uncovered_essentials` | `{ session_id, top_n? }` | Returns essential topics not yet covered, ranked by `surface_priority`. |
| `generate_shareable_plan` | `{ session_id, lang }` | Builds WhatsApp-ready plan text from `sessions.profile`. Calls main model with a tight template prompt. |
| `log_event` | `{ session_id, query, intent }` | Anonymizes (small model) then writes to `events`. |

**Slot extraction** is NOT a tool the model calls — it's a preprocessing step. When the user sends a free-text message, before the main agent call, fire the small model with the message + current `profile` and ask it to return any new slot values it can extract (strict JSON schema). Merge silently. This is how a single dump like *"Sunt din București, n-am mai fost la EC, am 29 de ani, nu vreau cort..."* fills the profile in one turn.

---

## 6. Agent Loop (high level)

```
POST /chat { session_id, lang, message }
  → load session (Mongo)
  → small-model slot-extraction: extract new profile values from message, update profile
  → build system prompt (tone + lang + current profile + uncovered essentials list)
  → main-model tool-use loop:
        while (response contains tool_calls):
            execute tool(s), append tool results, call model again
  → after final assistant message:
        small model: classify intent + anonymize query → write to events
        Heuristic: detect which essential topics the assistant touched → mark_topics_covered
  → return { assistant_message, profile, covered_topics }
```

**Three entry points share this loop:**
- Free search → frontend hits `/chat` with a one-shot message, no prior session
- Chat → ongoing `session_id`, normal loop
- Guided planner → frontend collects form answers, posts them to `/plan` which seeds `sessions.profile` then calls the loop with a synthetic "build me a plan" message

---

## 7. Build Order

Strict order — each step unblocks the next. Don't skip ahead.

1. **Repo scaffold + connections**
   - `pyproject.toml` (or `requirements.txt`) with: `fastapi`, `uvicorn`, `pydantic`, `motor`, `chromadb`, `openai` (for the Ollama OpenAI-compatible endpoint), `httpx`, `rank-bm25`, `python-dotenv`
   - `.env.example` as in section 2; real `.env` with placeholders
   - Mongo connection module + Chroma client module + Ollama client wrapper + health check route (`/health` pings all three)
2. **Seed scripts for mock data**
   - `python -m scripts.seed_essentials` → 10 essential topics (section 4) in RO + EN → Mongo
   - `python -m scripts.seed_lineup` → ~20 fictional artists with mood tags → Mongo
   - `seed_stages`, `seed_accommodations`, `seed_ticket_types` → Mongo
   - `seed_kb` → ~30 mock chunks covering transport, weather, rules, tone fragments → staged JSON, NOT yet embedded
   - **Show seed data to Marius before embedding.**
3. **Embedding pipeline**
   - `embeddings/ollama.py` — async wrapper for `/api/embeddings`
   - `scripts/embed_kb.py` — reads staged kb_chunks, embeds with bge-m3, upserts into Chroma; idempotent
   - BM25 index builder over the same corpus, persisted as a pickle alongside Chroma for fast startup
4. **Standalone tool: `search_kb`**
   - Hybrid retrieval (parallel Chroma `query` + BM25 `get_scores`, RRF fusion)
   - Smoke-test with sample queries in both languages before plugging into the agent
5. **Standalone tools: `query_lineup`, `estimate_budget`, `build_packing_list`**
   - Each with its own pytest-style smoke test
6. **Agent loop**
   - Tool registration (Pydantic → JSON schema), main-model call via OpenAI SDK, while-loop on `tool_calls`, session persistence in Mongo
   - Slot extraction preprocessing (small-model call)
7. **Coverage-map surfacing logic**
   - `get_uncovered_essentials` tool
   - System prompt instruction
   - Heuristic post-processor that marks topics covered
   - **This is what separates the project from a generic chatbot — do not cut it.**
8. **`generate_shareable_plan`**
   - Template prompt that turns `profile` + `covered_topics` into WhatsApp-friendly text in the chosen language
9. **`/plan` endpoint** for the guided planner entry point
10. **Insights logging** (`events` collection + a simple `/admin/insights` route returning aggregates)

---

## 8. Open Questions / Need from Marius

- [ ] **Mongo URI**: drop the real connection string into `.env` (placeholder in repo).
- [ ] **Google Maps key**: same — placeholder for now, real key when ready.
- [ ] **Frontend contract**: what does the frontend team want the request/response shape to look like? Lock it early so we don't refactor.
- [ ] **Persona pack from EC**: not blocking, but when delivered, load into `personas` and use as eval fixtures.
- [ ] **Hardware check for qwen2.5:14b**: confirm the dev machine can run it at usable speed; otherwise fall back to `qwen2.5:7b-instruct`.

---

## 9. Tone & Style Rules (bake into system prompts)

- "Friend who's been to EC before," not corporate, not bureaucratic, not overly cheery.
- Romanian replies must feel native — colloquial, not stiff translations.
- When something is genuinely uncertain (set times, exact prices closer to festival, weather), say "check this closer to the festival" rather than inventing.
- Never list 10 things at once. Surface essentials one or two at a time, framed as "by the way."
- The shareable plan output should be short, scannable, copy-pasteable into WhatsApp. No markdown headers, no bullet salad.
- Address the user directly. "Tu" in Romanian (not "Dumneavoastră").
- Avoid emoji unless the user uses them first.

---

## 10. Measurement Plan (for the demo deliverable)

Track via the `events` collection + a small admin route:

- Questions answered per session
- Completion rate of the guided planner
- Coverage rate: % of essential topics surfaced per session
- Top intents (transport, budget, weather, lineup, etc.) — feeds the "useful insights" requirement in the brief
- Repeated/unanswered queries (low retrieval scores) — surfaces gaps in the KB
- Shareable-plan generations per session (proxy for "share to friends" engagement)
- Avg messages-to-plan (proxy for time-saved)

---

## 11. Out of Scope (someone else owns / later)

- Frontend (chatbot UI, search box, guided planner forms, language toggle UI)
- Real EC content ingestion (we mock; real content swaps in via the same `kb_chunks` schema)
- Authentication (demo runs without it; sessions are anonymous via session_id cookie)
- Payments / ticket purchase flow (we link out, we don't sell)

---

## 12. File / Repo Layout (suggested)

```
ec-assistant/
├── app/
│   ├── main.py                     # FastAPI app entrypoint
│   ├── routes/
│   │   ├── chat.py
│   │   ├── plan.py
│   │   ├── admin.py
│   │   └── health.py
│   ├── agent/
│   │   ├── loop.py                 # tool-use loop
│   │   ├── prompts.py              # system prompts (RO + EN)
│   │   └── slot_extraction.py      # small-model preprocessor
│   ├── tools/
│   │   ├── search_kb.py
│   │   ├── query_lineup.py
│   │   ├── estimate_budget.py
│   │   ├── build_packing_list.py
│   │   ├── get_directions.py
│   │   ├── update_profile.py
│   │   ├── coverage.py
│   │   └── generate_plan.py
│   ├── db/
│   │   ├── mongo.py                # motor client + typed collection helpers
│   │   └── chroma.py               # Chroma persistent client + collection accessor
│   ├── embeddings/
│   │   └── ollama.py
│   ├── llm/
│   │   └── ollama_client.py        # OpenAI-compatible wrapper, main + small models
│   ├── lib/
│   │   ├── rrf.py                  # reciprocal rank fusion
│   │   └── bm25_index.py           # in-memory BM25 over kb_chunks
│   └── schemas/
│       └── tools.py                # Pydantic models for tool I/O
├── scripts/
│   ├── seed_essentials.py
│   ├── seed_lineup.py
│   ├── seed_stages.py
│   ├── seed_accommodations.py
│   ├── seed_ticket_types.py
│   ├── seed_kb.py
│   └── embed_kb.py
├── data/
│   ├── mock/                       # JSON seed data
│   └── chroma/                     # Chroma persistent dir (gitignored)
├── .env.example
├── .env                            # gitignored, placeholders for now
├── pyproject.toml
└── README.md
```

---

## 13. First Prompt to Drop in VSCode Claude

When you open this in Claude Code, the opening prompt is:

> Read HANDOFF.md top to bottom. Then scaffold the repo per section 12, implement build steps 1 and 2 from section 7, and stop. Don't touch the agent loop yet. Show me the seed data before you embed it.
