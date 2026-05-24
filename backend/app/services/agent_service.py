from collections.abc import AsyncIterator

import httpx

from app.db.repositories.chat_repo import get_history

AGENT_URL = "http://localhost:8000"


def _to_history(raw: list[dict]) -> list[dict]:
    """Strip DB-only fields, keep only role+content for the agent."""
    return [{"role": m["role"], "content": m["content"]} for m in raw]


async def get_agent_response(message: str, session_id: str) -> tuple[str, bool]:
    try:
        history = _to_history(await get_history(session_id))
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{AGENT_URL}/answer",
                json={"query": message, "lang": "en", "history": history},
            )
            res.raise_for_status()
            data = res.json()
            answered = not data.get("low_confidence", False)
            return data["answer"], answered
    except httpx.ConnectError:
        return "Agent service is not running. Please start it on port 8000.", False
    except Exception as exc:
        return f"Could not reach agent: {exc}", False


async def stream_agent_response(message: str, session_id: str) -> AsyncIterator[str]:
    try:
        history = _to_history(await get_history(session_id))
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{AGENT_URL}/answer/stream",
                json={"query": message, "lang": "en", "history": history},
            ) as res:
                res.raise_for_status()
                async for line in res.aiter_lines():
                    if line:
                        yield line + "\n"
    except httpx.ConnectError:
        import json
        yield json.dumps({"token": "Agent service is not running. Please start it on port 8000."}) + "\n"
        yield json.dumps({"done": True, "sources": [], "low_confidence": True}) + "\n"
    except Exception as exc:
        import json
        yield json.dumps({"token": f"Could not reach agent: {exc}"}) + "\n"
        yield json.dumps({"done": True, "sources": [], "low_confidence": True}) + "\n"
