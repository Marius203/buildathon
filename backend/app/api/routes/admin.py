from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.db.mongodb import get_db
from app.api.dependencies import get_current_user
from app.services.kb_service import process_document
import csv
import io

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
async def get_stats(user=Depends(get_current_user)):
    db = get_db()
    
    total_messages = await db.messages.count_documents({"role": "user"})
    total_conversations = len(await db.messages.distinct("session_id"))
    unanswered_count = await db.messages.count_documents({"role": "assistant", "answered": False})
    
    # top 5 intrebari
    pipeline = [
        {"$match": {"role": "user"}},
        {"$group": {"_id": "$content", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    cursor = db.messages.aggregate(pipeline)
    top_questions = [{"question": doc["_id"], "count": doc["count"]} async for doc in cursor]
    
    return {
        "total_messages": total_messages,
        "total_conversations": total_conversations,
        "unanswered_count": unanswered_count,
        "top_questions": top_questions
    }

@router.get("/unanswered")
async def get_unanswered(user=Depends(get_current_user)):
    db = get_db()
    cursor = db.messages.find({"role": "assistant", "answered": False}).sort("timestamp", -1).limit(50)
    messages = []
    async for msg in cursor:
        msg["_id"] = str(msg["_id"])
        messages.append(msg)
    return {"unanswered": messages}

@router.get("/stats/export")
async def export_stats(user=Depends(get_current_user)):
    db = get_db()
    cursor = db.messages.find({"role": "user"}).sort("timestamp", -1)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["session_id", "message", "timestamp"])
    
    async for msg in cursor:
        writer.writerow([msg["session_id"], msg["content"], msg["timestamp"]])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=stats.csv"}
    )

@router.post("/kb/process")
async def process_uploaded_file(body: dict, user=Depends(get_current_user)):
    url = body.get("url")
    file_type = body.get("type")  # "document" sau "image"
    filename = body.get("filename")
    
    db = get_db()
    await db.uploads.insert_one({
        "url": url,
        "filename": filename,
        "type": file_type,
        "uploaded_at": __import__("datetime").datetime.utcnow()
    })
    
    if file_type == "document":
        await process_document(url, filename)
    
    return {"message": "File processed", "url": url}