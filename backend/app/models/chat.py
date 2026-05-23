from pydantic import BaseModel, Field
from typing import Literal


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class MessageRequest(BaseModel):
    session_id: str
    message: str
    history: list[HistoryMessage] = Field(default_factory=list)

class MessageResponse(BaseModel):
    session_id: str
    user_message: str
    agent_response: str