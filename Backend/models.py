from pydantic import BaseModel

MODEL = "claude-haiku-4-5"
MAX_TOOL_CALLS = 4

class ChatRequest(BaseModel):
    topic: str
    session_id: str | None = None
    model: str = MODEL

class ChatResponse(BaseModel):
    brief: str
    session_id: str
    tool_calls: int
    tokens_used: int