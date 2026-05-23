from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db.mongodb import connect_db, close_db
from app.api.routes import auth, chat, feedback, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(lifespan=lifespan)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(feedback.router)
app.include_router(admin.router)