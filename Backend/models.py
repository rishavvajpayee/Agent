from datetime import datetime

from pydantic import BaseModel

MODEL = "claude-haiku-4-5"


class ChatRequest(BaseModel):
    topic: str
    session_id: str | None = None
    model: str = MODEL


class ChatResponse(BaseModel):
    brief: str
    session_id: str
    tool_calls: int
    tokens_used: int
    truncated: bool = False
    evidence_count: int = 0


class EvidenceItem(BaseModel):
    source_url: str
    key_claim: str
    quote: str
    created_at: datetime


class MessageItem(BaseModel):
    role: str
    content: str
    created_at: datetime


class SessionDetailResponse(BaseModel):
    session_id: str
    messages: list[MessageItem]
    evidence: list[EvidenceItem] = []


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
