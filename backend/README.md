# Backend

Placeholder for the services backend (auth, users, sessions persistence, anything outside the AI agent's scope). Owner: TBD.

## Suggested layout once code lands

```
backend/
├── app/                    # whatever stack (Node, Python, Go...)
├── tests/
├── README.md
└── <package manifest>
```

## Integration with the agent service

The agent service runs separately (see [../agent/README.md](../agent/README.md)) and exposes:

- `POST /search` — hybrid retrieval over the festival KB
- `POST /answer` — LLM-generated answer with cited sources

If sessions, user accounts, or persisted chat history are needed beyond what the agent stores locally, this backend owns them. Pass `session_id` (when implemented) to the agent's `/chat` route so it can thread context.
