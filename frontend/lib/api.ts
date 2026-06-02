import type {
  ApiErrorBody,
  ChatRequest,
  ChatResponse,
  DeleteSessionResponse,
  EvidenceItem,
  HealthResponse,
  SessionDetail,
  SessionList,
} from "./api-types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

/** Research runs can take several minutes (tool loop + synthesis). */
export const CHAT_REQUEST_TIMEOUT_MS = 300_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function authHeaders(accessToken?: string): HeadersInit {
  if (!accessToken) return {};
  return { Authorization: `Bearer ${accessToken}` };
}

function parseDetail(body: ApiErrorBody | undefined): string {
  if (!body?.detail) return "Request failed";
  if (typeof body.detail === "string") return body.detail;
  return body.detail.map((d) => d.msg).join(", ");
}

async function request<T>(
  path: string,
  options: RequestInit & { accessToken?: string; timeoutMs?: number } = {},
): Promise<T> {
  const { accessToken, timeoutMs, ...init } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...authHeaders(accessToken),
    ...(init.headers ?? {}),
  };

  const controller = new AbortController();
  const timeoutId =
    timeoutMs != null
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  let body: ApiErrorBody | T | undefined;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text) as ApiErrorBody | T;
    } catch {
      body = undefined;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      parseDetail(body as ApiErrorBody | undefined),
      res.status,
      body as ApiErrorBody | undefined,
    );
  }

  return body as T;
}

export function getApiBaseUrl(): string {
  return API_BASE;
}

export async function healthCheck(): Promise<HealthResponse> {
  return request<HealthResponse>("/health", { method: "GET" });
}

export async function chat(
  payload: ChatRequest,
  accessToken?: string,
): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    accessToken,
    body: JSON.stringify(payload),
    timeoutMs: CHAT_REQUEST_TIMEOUT_MS,
  });
}

export async function listSessions(
  accessToken?: string,
): Promise<SessionList> {
  return request<SessionList>("/sessions", {
    method: "GET",
    accessToken,
  });
}

export async function getSession(
  sessionId: string,
  accessToken?: string,
): Promise<SessionDetail> {
  return request<SessionDetail>(
    `/sessions/${encodeURIComponent(sessionId)}`,
    { method: "GET", accessToken },
  );
}

export async function deleteSession(
  sessionId: string,
  accessToken?: string,
): Promise<DeleteSessionResponse> {
  return request<DeleteSessionResponse>(
    `/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE", accessToken },
  );
}

export async function getSessionEvidence(
  sessionId: string,
  accessToken?: string,
): Promise<EvidenceItem[]> {
  return request<EvidenceItem[]>(
    `/sessions/${encodeURIComponent(sessionId)}/evidence`,
    { method: "GET", accessToken },
  );
}
