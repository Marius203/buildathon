from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.models.admin import FeedbackRequest
from app.db.mongodb import get_db
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/feedback", tags=["feedback"])

@router.post("/{message_id}")
async def give_feedback(message_id: str, body: FeedbackRequest, user=Depends(get_current_user)):
    db = get_db()
    result = await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"feedback": body.helpful}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Feedback saved"}