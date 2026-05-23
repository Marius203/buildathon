# Frontend

Placeholder for the UI. Owner: TBD.

## Suggested layout once code lands

```
frontend/
├── src/                    # whatever stack (Next.js, Vite + React, SvelteKit...)
├── public/
├── tests/
├── README.md
└── <package manifest>
```

## Integration with the agent service

Agent runs locally at `http://127.0.0.1:8000` (see [../agent/README.md](../agent/README.md)).

### Endpoints to call

**`POST /answer`** — for chat mode and free-search entry points

Request:
```json
{
  "query": "How do I get from Cluj to the festival?",
  "lang": "en",
  "k": 3
}
```

Response:
```json
{
  "query": "...",
  "lang": "en",
  "topic": null,
  "answer": "Take the EC train from Gara Mică — 35 lei...",
  "sources": [
    { "id": "...", "section": "9.1", "section_title": "...", "topic": "transport", "score": 0.032 }
  ],
  "low_confidence": false
}
```

`low_confidence: true` means the agent didn't find relevant context and refused cleanly. The UI may want to render that state distinctly (e.g. "I don't have that — try rephrasing or check the official site").

**`POST /search`** — raw retrieval, returns chunks without LLM generation. Useful for debug surfaces or for a "browse the KB" feature.

### Language toggle

Every request must include `lang: "ro" | "en"`. The user-facing toggle is the frontend's responsibility — the agent does not auto-detect.

### Live API docs

`http://127.0.0.1:8000/docs` while the agent is running.

See [../docs/HANDOFF.md](../docs/HANDOFF.md) for the three entry points (free search / chat / guided planner), tone rules, and what the WhatsApp-shareable plan output should look like.
