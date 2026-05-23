"""Terminal REPL for poking at the /search endpoint.

Run (separate terminal from the uvicorn process):
    .venv/Scripts/python -m scripts.chat

Commands:
    :lang ro | :lang en           switch query language
    :topic transport              filter to a topic
    :topic clear                  clear topic filter
    :k 3                          change number of retrieved chunks
    :mode answer | :mode search   toggle qwen answer vs raw retrieved chunks
    :help                         show commands
    :quit / Ctrl-C                exit
Anything else is treated as a query.
"""
from __future__ import annotations

import sys

import httpx

# Ensure stdout handles diacritics on Windows.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE_URL = "http://127.0.0.1:8000"
KNOWN_TOPICS = {
    "overview", "dates_location", "lineup", "tickets", "cashless", "transport",
    "camping", "accommodation", "facilities", "safety", "rules", "children",
    "accessibility", "experience", "packing", "food", "budget", "tips", "audience",
}

BANNER = """
EC assistant — search REPL
type a question, or :help for commands, :quit to exit
"""

HELP = """
commands:
  :lang ro | :lang en     switch query language
  :topic <name>           filter by topic (one of: see HANDOFF)
  :topic clear            remove topic filter
  :k <int>                number of retrieved chunks (1..20)
  :mode answer            generate an answer with qwen (default)
  :mode search            show raw retrieved chunks (debug)
  :state                  show current lang/topic/k/mode
  :health                 ping backend /health
  :help                   this message
  :quit                   exit (Ctrl-C also works)
"""


class State:
    def __init__(self) -> None:
        self.lang = "en"
        self.topic: str | None = None
        self.k = 5
        self.mode = "answer"  # "answer" | "search"


def fmt_hit(i: int, hit: dict) -> str:
    text = hit.get("text") or ""
    if len(text) > 280:
        text = text[:280].rstrip() + "..."
    return (
        f"  [{i}] {hit['id']}  score={hit['score']:.4f}\n"
        f"      topic={hit.get('topic')}  section={hit.get('section')}  "
        f"({hit.get('section_title')})\n"
        f"      {text}"
    )


def cmd_state(state: State) -> None:
    print(f"  lang={state.lang}  topic={state.topic}  k={state.k}  mode={state.mode}")


def cmd_health(client: httpx.Client) -> None:
    try:
        r = client.get("/health")
        r.raise_for_status()
        data = r.json()
        print(f"  status: {data.get('status')}")
        for name, comp in data.get("components", {}).items():
            print(f"    {name}: {comp}")
    except Exception as exc:
        print(f"  [err] health check failed: {exc}")


def handle_command(line: str, state: State, client: httpx.Client) -> bool:
    parts = line.strip().split(maxsplit=1)
    cmd = parts[0]
    arg = parts[1].strip() if len(parts) > 1 else ""

    if cmd in (":quit", ":exit", ":q"):
        return False
    if cmd == ":help":
        print(HELP)
    elif cmd == ":state":
        cmd_state(state)
    elif cmd == ":health":
        cmd_health(client)
    elif cmd == ":lang":
        if arg in ("ro", "en"):
            state.lang = arg
            print(f"  lang -> {arg}")
        else:
            print("  usage: :lang ro | :lang en")
    elif cmd == ":topic":
        if arg == "clear" or arg == "":
            state.topic = None
            print("  topic cleared")
        elif arg in KNOWN_TOPICS:
            state.topic = arg
            print(f"  topic -> {arg}")
        else:
            print(f"  unknown topic '{arg}'. known: {', '.join(sorted(KNOWN_TOPICS))}")
    elif cmd == ":k":
        try:
            n = int(arg)
            if not 1 <= n <= 20:
                raise ValueError
            state.k = n
            print(f"  k -> {n}")
        except ValueError:
            print("  usage: :k <int 1..20>")
    elif cmd == ":mode":
        if arg in ("answer", "search"):
            state.mode = arg
            print(f"  mode -> {arg}")
        else:
            print("  usage: :mode answer | :mode search")
    else:
        print(f"  unknown command '{cmd}'. try :help")
    return True


def do_search(query: str, state: State, client: httpx.Client) -> None:
    payload = {"query": query, "lang": state.lang, "k": state.k}
    if state.topic:
        payload["topic"] = state.topic
    try:
        r = client.post("/search", json=payload)
        r.raise_for_status()
    except httpx.HTTPError as exc:
        print(f"  [err] {exc}")
        return
    data = r.json()
    results = data.get("results", [])
    if not results:
        print("  (no results)")
        return
    for i, hit in enumerate(results, start=1):
        print(fmt_hit(i, hit))


def do_answer(query: str, state: State, client: httpx.Client) -> None:
    payload = {"query": query, "lang": state.lang, "k": state.k}
    if state.topic:
        payload["topic"] = state.topic
    try:
        r = client.post("/answer", json=payload, timeout=300.0)
        r.raise_for_status()
    except httpx.HTTPError as exc:
        print(f"  [err] {exc}")
        return
    data = r.json()
    print(f"\n  {data.get('answer', '').strip()}\n")
    srcs = data.get("sources", [])
    if srcs:
        labels = [f"{s.get('section')} ({s.get('topic')})" for s in srcs]
        print(f"  sources: {', '.join(labels)}")


def main() -> None:
    state = State()
    with httpx.Client(base_url=BASE_URL, timeout=60.0) as client:
        # Probe backend before entering the loop.
        try:
            client.get("/health").raise_for_status()
        except Exception as exc:
            print(f"[err] cannot reach backend at {BASE_URL}: {exc}")
            print("       start it with: .venv/Scripts/python -m uvicorn app.main:app --port 8000")
            sys.exit(1)

        print(BANNER)
        cmd_state(state)
        while True:
            try:
                line = input("\n> ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                break
            if not line:
                continue
            if line.startswith(":"):
                if not handle_command(line, state, client):
                    break
            else:
                if state.mode == "search":
                    do_search(line, state, client)
                else:
                    do_answer(line, state, client)


if __name__ == "__main__":
    main()
