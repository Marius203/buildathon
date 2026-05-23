from collections.abc import AsyncIterator

import httpx

AGENT_URL = "http://localhost:8000"


async def get_agent_response(message: str, session_id: str, lang: str = "en") -> tuple[str, bool]:
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{AGENT_URL}/answer",
                json={"query": message, "lang": lang},
            )
            res.raise_for_status()
            data = res.json()
            answered = not data.get("low_confidence", False)
            return data["answer"], answered
    except httpx.ConnectError:
        return "Agent service is not running. Please start it on port 8000.", False
    except Exception as exc:
        return f"Could not reach agent: {exc}", False


async def stream_agent_response(message: str, lang: str = "en") -> AsyncIterator[str]:
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{AGENT_URL}/answer/stream",
                json={"query": message, "lang": lang},
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
