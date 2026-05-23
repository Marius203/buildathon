from pydantic_settings import BaseSettings

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
        env_file = ".env"

settings = Settings()