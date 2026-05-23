from datetime import datetime
from app.db.mongodb import get_db

async def save_message(session_id: str, role: str, content: str, answered: bool = True):
    db = get_db()
    message = {
        "session_id": session_id,
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow(),
        "feedback": None,
        "answered": answered
    }
    result = await db.messages.insert_one(message)
    return str(result.inserted_id)

async def get_history(session_id: str):
    db = get_db()
    cursor = db.messages.find({"session_id": session_id}).sort("timestamp", 1)
    messages = []
    async for msg in cursor:
        msg["_id"] = str(msg["_id"])
        messages.append(msg)
    return messages