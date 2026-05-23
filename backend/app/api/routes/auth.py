from fastapi import APIRouter, HTTPException, Depends
from app.models.user import RegisterRequest, LoginRequest, TokenResponse
from app.db.repositories.user_repo import get_user_by_email, create_user
from app.core.security import hash_password, verify_password, create_access_token
from app.db.mongodb import get_db
from app.api.dependencies import get_current_admin

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest):
    existing = await get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    await create_user(body.email, hash_password(body.password))
    token = create_access_token({"sub": body.email})
    return TokenResponse(access_token=token)

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = await get_user_by_email(body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user["email"]})
    return TokenResponse(access_token=token)

@router.post("/make-admin/{email}")
async def make_admin(email: str, user=Depends(get_current_admin)):
    db = get_db()
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"is_admin": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"{email} is now admin"}