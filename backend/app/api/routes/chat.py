import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_current_user
from app.db.repositories.chat_repo import get_history, save_message
from app.models.chat import MessageRequest, MessageResponse
from app.services.agent_service import get_agent_response, stream_agent_response

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message", response_model=MessageResponse)
async def send_message(body: MessageRequest, user=Depends(get_current_user)):
    await save_message(body.session_id, "user", body.message)
    response, answered = await get_agent_response(body.message, body.session_id)
    await save_message(body.session_id, "assistant", response, answered)
    return MessageResponse(
        session_id=body.session_id,
        user_message=body.message,
        agent_response=response,
    )


@router.post("/stream")
async def stream_message(body: MessageRequest, user=Depends(get_current_user)):
    await save_message(body.session_id, "user", body.message)

    tokens: list[str] = []
    low_confidence = False

    async def generate():
        nonlocal low_confidence
        async for chunk in stream_agent_response(body.message):
            yield chunk
            try:
                data = json.loads(chunk.strip())
                if "token" in data:
                    tokens.append(data["token"])
                elif data.get("done"):
                    low_confidence = data.get("low_confidence", False)
            except Exception:
                pass
        answer_text = "".join(tokens)
        await save_message(body.session_id, "assistant", answer_text, not low_confidence)

    return StreamingResponse(generate(), media_type="application/x-ndjson")


@router.get("/history/{session_id}")
async def chat_history(session_id: str, user=Depends(get_current_user)):
    messages = await get_history(session_id)
    return {"session_id": session_id, "messages": messages}
