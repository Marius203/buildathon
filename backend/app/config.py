from pathlib import Path

from pydantic_settings import BaseSettings

# Repo root = backend/app/config.py -> backend/app -> backend -> repo
ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    MONGODB_URI: str
    MONGODB_DB_NAME: str = "ec_chatbot"
    JWT_SECRET: str = "cevarandom"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7
    UPLOADTHING_SECRET: str
    UPLOADTHING_BUCKET_DOCS: str
    UPLOADTHING_BUCKET_IMAGES: str
    UPLOADTHING_APP_ID: str = "gskdonr2lr"

    class Config:
        env_file = str(ROOT_ENV)
        extra = "ignore"  # root .env carries agent vars too


settings = Settings()
