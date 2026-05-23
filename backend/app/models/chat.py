from pydantic import BaseModel
from typing import Optional

class MessageRequest(BaseModel):
    session_id: str
    message: str

class MessageResponse(BaseModel):
    session_id: str
    user_message: str
    agent_response: str