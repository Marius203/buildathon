from fastapi import Header, HTTPException
from app.core.security import decode_token
from app.db.repositories.user_repo import get_user_by_email

async def get_current_user(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        return payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def get_current_admin(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        email = payload.get("sub")
        user = await get_user_by_email(email)
        if not user or not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return email
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")