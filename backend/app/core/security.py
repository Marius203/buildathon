from datetime import datetime, timedelta
from jose import jwt
from app.config import settings

def hash_password(password: str) -> str:
    return password  # plain text pentru prototip

def verify_password(plain: str, hashed: str) -> bool:
    return plain == hashed

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])