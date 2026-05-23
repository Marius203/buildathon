from datetime import datetime
from app.db.mongodb import get_db

async def save_message(session_id: str, role: str, content: str, answered: bool = True):
    db = get_db()
    message = {
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow(),
        "feedback": None,
        "answered": answered
    }
    # Dacă conversația există o actualizăm, altfel o creăm
    result = await db.conversations.update_one(
        {"session_id": session_id},
        {
            "$push": {"messages": message},
            "$set": {"updated_at": datetime.utcnow()},
            "$setOnInsert": {"session_id": session_id, "created_at": datetime.utcnow()}
        },
        upsert=True
    )
    return session_id

async def mark_last_user_message_unanswered(session_id: str):
    db = get_db()
    conv = await db.conversations.find_one({"session_id": session_id}, {"messages": 1})
    if not conv:
        return
    messages = conv.get("messages", [])
    for i in range(len(messages) - 1, -1, -1):
        if messages[i].get("role") == "user":
            await db.conversations.update_one(
                {"session_id": session_id},
                {"$set": {f"messages.{i}.answered": False}}
            )
            return

async def get_history(session_id: str):
    db = get_db()
    conv = await db.conversations.find_one({"session_id": session_id})
    if not conv:
        return []
    return conv.get("messages", [])