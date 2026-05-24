from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from app.db.mongodb import get_db
from app.api.dependencies import get_current_admin, get_current_user
from app.services.kb_service import process_document, process_image
from bson import ObjectId
import csv
import io
import datetime

router = APIRouter(prefix="/admin", tags=["admin"])

# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(user=Depends(get_current_admin)):
    db = get_db()

    total_conversations = await db.conversations.count_documents({})

    pipeline_total = [
        {"$unwind": "$messages"},
        {"$match": {"messages.role": "user"}},
        {"$count": "total"}
    ]
    result = await db.conversations.aggregate(pipeline_total).to_list(1)
    total_messages = result[0]["total"] if result else 0

    pipeline_unanswered = [
        {"$unwind": "$messages"},
        {"$match": {"messages.role": "user", "messages.answered": False}},
        {"$count": "total"}
    ]
    result = await db.conversations.aggregate(pipeline_unanswered).to_list(1)
    unanswered_count = result[0]["total"] if result else 0

    today = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    conversations_today = await db.conversations.count_documents({"created_at": {"$gte": today}})

    users_today = await db.users.count_documents({"created_at": {"$gte": today}})
    total_users = await db.users.count_documents({})

    pipeline_feedback = [
        {"$unwind": "$messages"},
        {"$match": {"messages.feedback": {"$ne": None}}},
        {"$group": {"_id": "$messages.feedback", "count": {"$sum": 1}}}
    ]
    feedback_results = await db.conversations.aggregate(pipeline_feedback).to_list(10)
    positive = next((r["count"] for r in feedback_results if r["_id"] == True), 0)
    negative = next((r["count"] for r in feedback_results if r["_id"] == False), 0)

    return {
        "total_conversations": total_conversations,
        "conversations_today": conversations_today,
        "total_messages": total_messages,
        "unanswered_count": unanswered_count,
        "total_users": total_users,
        "users_today": users_today,
        "feedback": {
            "positive": positive,
            "negative": negative,
            "total": positive + negative
        }
    }

@router.get("/stats/hourly")
async def get_hourly_stats(user=Depends(get_current_admin)):
    """Mesaje per ora in ultimele 24h - pentru grafic"""
    db = get_db()
    since = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    pipeline = [
        {"$unwind": "$messages"},
        {"$match": {"messages.role": "user", "messages.timestamp": {"$gte": since}}},
        {"$group": {
            "_id": {"$hour": "$messages.timestamp"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    results = await db.conversations.aggregate(pipeline).to_list(24)
    hours = {r["_id"]: r["count"] for r in results}
    current_hour = datetime.datetime.utcnow().hour
    data = []
    for i in range(24):
        hour = (current_hour - 23 + i) % 24
        data.append({"hour": f"{hour:02d}:00", "count": hours.get(hour, 0)})
    return {"hourly": data}

@router.get("/stats/categories")
async def get_category_stats(user=Depends(get_current_admin)):
    """Categorii populare detectate din mesaje"""
    db = get_db()
    categories = {
        "transport": ["transport", "drum", "ajung", "cluj", "shuttle", "mașin", "bus", "tren"],
        "cazare": ["cazare", "dorm", "cort", "camping", "hotel", "glamping"],
        "buget": ["buget", "bani", "cost", "cât", "cat", "pret", "cheltuieli"],
        "vreme": ["ploaie", "noroi", "vreme", "meteo", "cizme"],
        "muzica": ["muzic", "artist", "scena", "party", "electronic", "rock"],
        "acces": ["bratara", "acces", "cashless", "dus", "locker", "intrare"],
    }

    pipeline = [
        {"$unwind": "$messages"},
        {"$match": {"messages.role": "user"}},
        {"$project": {"content": {"$toLower": "$messages.content"}}}
    ]
    results = await db.conversations.aggregate(pipeline).to_list(10000)

    counts = {cat: 0 for cat in categories}
    counts["altele"] = 0
    for doc in results:
        content = doc.get("content", "")
        matched = False
        for cat, keywords in categories.items():
            if any(kw in content for kw in keywords):
                counts[cat] += 1
                matched = True
                break
        if not matched:
            counts["altele"] += 1

    return {"categories": [{"name": k, "count": v} for k, v in counts.items()]}

@router.get("/unanswered")
async def get_unanswered(user=Depends(get_current_admin)):
    db = get_db()
    pipeline = [
        {"$unwind": "$messages"},
        {"$match": {"messages.role": "user", "messages.answered": False}},
        {"$project": {"session_id": 1, "message": "$messages", "user_email": 1, "_id": 0}},
        {"$sort": {"message.timestamp": -1}},
        {"$limit": 200}
    ]
    results = await db.conversations.aggregate(pipeline).to_list(200)

    groups = {}
    for item in results:
        key = (item.get("message", {}).get("content") or "").strip().lower()
        if not key:
            continue
        if key not in groups:
            groups[key] = {
                "content": item["message"]["content"],
                "count": 0,
                "sessions": [],
                "latest_timestamp": None,
            }
        groups[key]["count"] += 1
        groups[key]["sessions"].append({
            "session_id": item.get("session_id"),
            "user_email": item.get("user_email"),
        })
        ts = item.get("message", {}).get("timestamp")
        if ts and (groups[key]["latest_timestamp"] is None or ts > groups[key]["latest_timestamp"]):
            groups[key]["latest_timestamp"] = ts

    grouped = sorted(groups.values(), key=lambda x: (-x["count"], -(x["latest_timestamp"].timestamp() if x["latest_timestamp"] else 0)))
    return {"unanswered": grouped[:50]}


@router.post("/unanswered/reply")
async def reply_to_unanswered(body: dict, admin=Depends(get_current_admin)):
    db = get_db()
    message_content = body.get("message_content", "").strip()
    reply = body.get("reply", "").strip()
    sessions = body.get("sessions", [])

    if not reply or not message_content or not sessions:
        raise HTTPException(status_code=400, detail="message_content, reply si sessions sunt obligatorii")

    now = datetime.datetime.utcnow()
    replied_to = 0
    notif_docs = []

    for s in sessions:
        session_id = s.get("session_id")
        user_email = s.get("user_email")
        if not session_id:
            continue
        conv = await db.conversations.find_one({"session_id": session_id}, {"messages": 1})
        if not conv:
            continue
        messages = conv.get("messages", [])
        target_index = None
        for i, msg in enumerate(messages):
            if (msg.get("role") == "user"
                    and msg.get("answered") == False
                    and msg.get("content", "").strip().lower() == message_content.lower()):
                target_index = i
                break
        if target_index is None:
            continue
        await db.conversations.update_one(
            {"session_id": session_id},
            {"$set": {f"messages.{target_index}.answered": True}}
        )
        await db.conversations.update_one(
            {"session_id": session_id},
            {"$push": {"messages": {
                "role": "assistant", "content": reply, "timestamp": now,
                "feedback": None, "answered": True, "from_admin": True,
            }}, "$set": {"updated_at": now}}
        )
        replied_to += 1
        if user_email:
            notif_docs.append({
                "user_email": user_email, "question": message_content,
                "answer": reply, "read": False, "created_at": now,
            })

    if notif_docs:
        await db.notifications.insert_many(notif_docs)

    return {"message": f"Raspuns trimis la {replied_to} conversatii"}


@router.post("/unanswered/reply")
async def reply_to_unanswered(body: dict, admin=Depends(get_current_admin)):
    db = get_db()
    session_id = body.get("session_id")
    message_content = body.get("message_content")
    user_email = body.get("user_email")
    reply = body.get("reply", "").strip()

    if not session_id or not reply or not message_content:
        raise HTTPException(status_code=400, detail="session_id, message_content si reply sunt obligatorii")

    conv = await db.conversations.find_one({"session_id": session_id}, {"messages": 1})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversatie negasita")

    messages = conv.get("messages", [])
    target_index = None
    for i, msg in enumerate(messages):
        if (msg.get("role") == "user"
                and msg.get("answered") == False
                and msg.get("content") == message_content):
            target_index = i
            break

    if target_index is None:
        raise HTTPException(status_code=404, detail="Mesajul nu a fost gasit")

    await db.conversations.update_one(
        {"session_id": session_id},
        {"$set": {f"messages.{target_index}.answered": True}}
    )
    admin_message = {
        "role": "assistant",
        "content": reply,
        "timestamp": datetime.datetime.utcnow(),
        "feedback": None,
        "answered": True,
        "from_admin": True,
    }
    await db.conversations.update_one(
        {"session_id": session_id},
        {"$push": {"messages": admin_message}, "$set": {"updated_at": datetime.datetime.utcnow()}}
    )

    if user_email:
        await db.notifications.insert_one({
            "user_email": user_email,
            "question": message_content,
            "answer": reply,
            "read": False,
            "created_at": datetime.datetime.utcnow(),
        })

    return {"message": "Raspuns salvat cu succes"}


@router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    db = get_db()
    cursor = db.notifications.find({"user_email": user}).sort("created_at", -1).limit(20)
    notifs = []
    async for n in cursor:
        n["_id"] = str(n["_id"])
        notifs.append(n)
    return {"notifications": notifs}


@router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user=Depends(get_current_user)):
    db = get_db()
    await db.notifications.update_one(
        {"_id": ObjectId(notif_id), "user_email": user},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

@router.post("/broadcast")
async def broadcast_notification(body: dict, admin=Depends(get_current_admin)):
    db = get_db()
    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Mesajul nu poate fi gol")

    users = await db.users.distinct("email")
    if not users:
        return {"message": "Nu există useri înregistrați", "sent_to": 0}

    now = datetime.datetime.utcnow()
    notifs = [
        {
            "user_email": email,
            "question": None,
            "answer": None,
            "broadcast_message": message,
            "is_broadcast": True,
            "read": False,
            "created_at": now,
        }
        for email in users
    ]
    await db.notifications.insert_many(notifs)
    return {"message": "Broadcast trimis cu succes", "sent_to": len(users)}


@router.get("/broadcast/history")
async def get_broadcast_history(admin=Depends(get_current_admin)):
    db = get_db()
    # Ia broadcast-urile unice dupa mesaj si data (unul per trimitere)
    pipeline = [
        {"$match": {"is_broadcast": True}},
        {"$group": {
            "_id": "$broadcast_message",
            "sent_at": {"$min": "$created_at"},
            "sent_to": {"$sum": 1},
        }},
        {"$sort": {"sent_at": -1}},
        {"$limit": 50},
    ]
    results = await db.notifications.aggregate(pipeline).to_list(50)
    return {"broadcasts": [
        {
            "message": r["_id"],
            "sent_at": r["sent_at"].isoformat() if r["sent_at"] else None,
            "sent_to": r["sent_to"],
        }
        for r in results
    ]}



@router.get("/stats/unanswered-themes")
async def get_unanswered_themes(user=Depends(get_current_admin)):
    """Intrebarile fara raspuns grupate pe tema"""
    db = get_db()
    categories = {
        "transport": ["transport", "drum", "ajung", "cluj", "shuttle", "mașin", "bus", "tren", "gara"],
        "cazare": ["cazare", "dorm", "cort", "camping", "hotel", "glamping", "cort"],
        "buget": ["buget", "bani", "cost", "cât", "cat", "pret", "cheltuieli", "scump"],
        "vreme": ["ploaie", "noroi", "vreme", "meteo", "cizme", "umbrela"],
        "muzica": ["muzic", "artist", "scena", "party", "electronic", "rock", "lineup"],
        "acces": ["bratara", "acces", "cashless", "dus", "locker", "intrare", "bilet"],
    }

    pipeline = [
        {"$unwind": "$messages"},
        {"$match": {"messages.role": "user", "messages.answered": False}},
        {"$project": {"content": {"$toLower": "$messages.content"}, "timestamp": "$messages.timestamp"}},
        {"$sort": {"timestamp": -1}},
        {"$limit": 200}
    ]
    results = await db.conversations.aggregate(pipeline).to_list(200)

    counts = {cat: 0 for cat in categories}
    counts["altele"] = 0
    examples = {cat: [] for cat in categories}
    examples["altele"] = []

    for doc in results:
        content_text = doc.get("content", "")
        matched = False
        for cat, keywords in categories.items():
            if any(kw in content_text for kw in keywords):
                counts[cat] += 1
                if len(examples[cat]) < 3:
                    examples[cat].append(content_text[:80])
                matched = True
                break
        if not matched:
            counts["altele"] += 1
            if len(examples["altele"]) < 3:
                examples["altele"].append(content_text[:80])

    return {
        "themes": [
            {"name": k, "count": v, "examples": examples[k]}
            for k, v in sorted(counts.items(), key=lambda x: -x[1])
            if v > 0
        ]
    }


@router.get("/stats/peak-hours")
async def get_peak_hours(user=Depends(get_current_admin)):
    """Distributia mesajelor pe ore din zi - toate timpurile, nu doar 24h"""
    db = get_db()
    pipeline = [
        {"$unwind": "$messages"},
        {"$match": {"messages.role": "user"}},
        {"$group": {
            "_id": {"$hour": "$messages.timestamp"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    results = await db.conversations.aggregate(pipeline).to_list(24)
    hours = {r["_id"]: r["count"] for r in results}
    
    peak_hour = max(hours, key=hours.get) if hours else 0
    
    return {
        "hours": [{"hour": f"{h:02d}:00", "count": hours.get(h, 0)} for h in range(24)],
        "peak_hour": f"{peak_hour:02d}:00",
        "peak_count": hours.get(peak_hour, 0)
    }

@router.get("/stats/export")
async def export_stats(user=Depends(get_current_admin)):
    db = get_db()
    pipeline = [
        {"$unwind": "$messages"},
        {"$match": {"messages.role": "user"}},
        {"$project": {
            "session_id": 1,
            "content": "$messages.content",
            "timestamp": "$messages.timestamp",
            "_id": 0
        }},
        {"$sort": {"timestamp": -1}}
    ]
    results = await db.conversations.aggregate(pipeline).to_list(10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["session_id", "message", "timestamp"])
    for msg in results:
        writer.writerow([msg["session_id"], msg["content"], msg["timestamp"]])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=stats.csv"}
    )

# ─── Favorites ────────────────────────────────────────────────────────────────

@router.get("/favorites")
async def get_favorites(user=Depends(get_current_admin)):
    db = get_db()
    cursor = db.favorites.find({}).sort("created_at", -1)
    favorites = []
    async for fav in cursor:
        fav["_id"] = str(fav["_id"])
        favorites.append(fav)
    return {"favorites": favorites}

@router.post("/favorites")
async def add_favorite(body: dict, user=Depends(get_current_admin)):
    db = get_db()
    question = body.get("question", "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    existing = await db.favorites.find_one({"question": question})
    if existing:
        raise HTTPException(status_code=400, detail="Already in favorites")
    await db.favorites.insert_one({
        "question": question,
        "created_at": datetime.datetime.utcnow()
    })
    return {"message": "Added to favorites"}

@router.delete("/favorites/{favorite_id}")
async def delete_favorite(favorite_id: str, user=Depends(get_current_admin)):
    db = get_db()
    result = await db.favorites.delete_one({"_id": ObjectId(favorite_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"message": "Deleted"}

@router.get("/favorites/suggestions")
async def get_favorite_suggestions(user=Depends(get_current_admin), threshold: int = 3):
    """Intrebari puse de mai multe ori care nu sunt inca in favorites"""
    db = get_db()
    pipeline = [
        {"$unwind": "$messages"},
        {"$match": {"messages.role": "user"}},
        {"$group": {"_id": "$messages.content", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": threshold}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    results = await db.conversations.aggregate(pipeline).to_list(20)
    existing_favs = await db.favorites.distinct("question")
    suggestions = [
        {"question": r["_id"], "count": r["count"]}
        for r in results
        if r["_id"] not in existing_favs
    ]
    return {"suggestions": suggestions}

# ─── Feedback (accesat de useri normali) ──────────────────────────────────────

@router.post("/feedback")
async def give_feedback(body: dict, user=Depends(get_current_user)):
    """
    Body: { session_id, message_index, helpful: true/false }
    message_index = indexul mesajului assistant in array-ul de messages
    """
    db = get_db()
    session_id = body.get("session_id")
    message_index = body.get("message_index")
    helpful = body.get("helpful")

    if session_id is None or message_index is None or helpful is None:
        raise HTTPException(status_code=400, detail="session_id, message_index and helpful are required")

    field = f"messages.{message_index}.feedback"
    result = await db.conversations.update_one(
        {"session_id": session_id},
        {"$set": {field: helpful}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Feedback saved"}

# ─── KB Upload ────────────────────────────────────────────────────────────────

@router.post("/kb/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_admin)):
    content = await file.read()
    file_type = file.content_type
    filename = file.filename
    db = get_db()

    if file_type == "application/pdf":
        url = await process_document(content, filename)
    elif file_type.startswith("image/"):
        url = await process_image(content, filename, file_type)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    await db.uploads.insert_one({
        "url": url,
        "filename": filename,
        "type": "document" if file_type == "application/pdf" else "image",
        "uploaded_at": datetime.datetime.utcnow()
    })

    return {"message": "File uploaded", "url": url}