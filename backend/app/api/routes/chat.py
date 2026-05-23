from fastapi import APIRouter, Depends
from app.models.chat import MessageRequest, MessageResponse
from app.services.agent_service import get_agent_response
from app.db.repositories.chat_repo import save_message, get_history
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/message", response_model=MessageResponse)
async def send_message(body: MessageRequest, user=Depends(get_current_user)):
    await save_message(body.session_id, "user", body.message)

    response, answered = await get_agent_response(body.message, body.session_id)

    await save_message(body.session_id, "assistant", response, answered)

    return MessageResponse(
        session_id=body.session_id,
        user_message=body.message,
        agent_response=response
    )

@router.get("/history/{session_id}")
async def chat_history(session_id: str, user=Depends(get_current_user)):
    messages = await get_history(session_id)
    return {"session_id": session_id, "messages": messages}