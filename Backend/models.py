from datetime import datetime

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


class MessageItem(BaseModel):
    role: str
    content: str
    created_at: datetime


class SessionDetailResponse(BaseModel):
    session_id: str
    messages: list[MessageItem]


class SessionSummary(BaseModel):
    session_id: str
    title: str | None = None
    message_count: int
    created_at: datetime
    updated_at: datetime


class SessionListResponse(BaseModel):
    sessions: list[SessionSummary]


class DeleteSessionResponse(BaseModel):
    ok: bool
    session_id: str
    deleted_messages: int