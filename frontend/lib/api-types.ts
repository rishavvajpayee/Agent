export interface ChatRequest {
  topic: string;
  session_id?: string | null;
  model?: string;
}

export interface ChatResponse {
  brief: string;
  session_id: string;
  tool_calls: number;
  tokens_used: number;
  truncated: boolean;
  evidence_count: number;
}

export interface EvidenceItem {
  source_url: string;
  key_claim: string;
  quote: string;
  created_at: string;
}

export interface MessageItem {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface SessionDetail {
  session_id: string;
  messages: MessageItem[];
  evidence: EvidenceItem[];
}

export interface SessionSummary {
  session_id: string;
  title: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface SessionList {
  sessions: SessionSummary[];
}

export interface DeleteSessionResponse {
  ok: boolean;
  session_id: string;
  deleted_messages: number;
}

export interface HealthResponse {
  message: string;
}

export interface ApiErrorBody {
  detail?: string | { msg: string }[];
}
