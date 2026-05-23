from app.db.mongodb import get_db

async def get_user_by_email(email: str):
    db = get_db()
    return await db.users.find_one({"email": email})

async def create_user(email: str, password_hash: str):
    db = get_db()
    user = {
        "email": email,
        "password_hash": password_hash,
        "is_admin": False,
        "created_at": __import__("datetime").datetime.utcnow()
    }
    result = await db.users.insert_one(user)
    return str(result.inserted_id)