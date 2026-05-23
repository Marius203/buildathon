from datetime import datetime

from app.db.mongodb import get_db
from app.services.lang_detect import detect_lang


async def get_or_set_session_lang(session_id: str, first_message: str) -> str:
    """Return the locked-in language for a session. Detects from first_message
    on initial call and persists; subsequent calls return the stored value."""
    db = get_db()
    conv = await db.conversations.find_one({"session_id": session_id}, {"lang": 1})
    if conv and conv.get("lang"):
        return conv["lang"]
    lang = await detect_lang(first_message)
    await db.conversations.update_one(
        {"session_id": session_id},
        {"$set": {"lang": lang}, "$setOnInsert": {"session_id": session_id, "created_at": datetime.utcnow()}},
        upsert=True,
    )
    return lang


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

async def get_history(session_id: str):
    db = get_db()
    conv = await db.conversations.find_one({"session_id": session_id})
    if not conv:
        return []
    return conv.get("messages", [])