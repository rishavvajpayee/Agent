# Demo verification — agent, tools, and session memory

Checklist to verify the working agent deliverable before submission.

## Prerequisites

```bash
cp .env.example .env
# Set ANTHROPIC_API_KEY, SERPER_API_KEY
# Set SKIP_AUTH=true for local demo without Stack Auth
docker compose up --build
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| API health | http://localhost:8000/health |

## 1. Tool use (single turn)

1. Open http://localhost:3000 with `SKIP_AUTH=true`.
2. Ask: *Compare PostgreSQL vs MongoDB for a session-based chat application.*
3. Confirm:
   - Response includes **Summary**, **Key Findings**, **Contradictions**, **Confidence**, **Sources**.
   - **Evidence** panel shows 3+ saved claims with URLs.
   - Network tab: `POST /chat` returns `tool_calls` > 0, `evidence_count` ≥ 3.

## 2. Session memory (multi-turn)

1. In the same chat session, send a follow-up: *Add a section on connection pooling best practices.*
2. Confirm:
   - Same `session_id` in the URL (`/chat/[sessionId]`).
   - Assistant answer references prior topic (Postgres/MongoDB), not a blank new thread.
   - Sidebar lists the session; reloading the page restores messages via `GET /sessions/{id}`.

**Implementation path:** [`use-chat.ts`](../frontend/hooks/use-chat.ts) passes `session_id` on follow-up; [`run_agent`](../Backend/main.py) loads history via [`get_history`](../Backend/session.py).

## 3. Truncation / graceful degradation (frontend)

1. Ask a very broad question (e.g. intermittent fasting benefits and risks across populations).
2. Confirm the UI shows an amber **tool limit** banner when `truncated: true`, but the brief still renders with **Summary** and findings.
3. Other handled cases: incomplete sections (warning), agent crash / length-limit messages (error card + retry), thin or missing evidence (info/warning), API offline banner, 5-minute request timeout with retry.

Eval quick run: see [eval/RESULTS.md](../eval/RESULTS.md) — g01 truncated but graceful pass.

## 4. Automated smoke

```bash
# Unit eval (no API)
PYTHONPATH=Backend:eval python3 eval/runner.py --unit-only

# Live quick eval (Docker + API keys)
./eval/run_docker.sh --quick
```

## 5. API-only (optional)

With `SKIP_AUTH=true` on the backend container:

```bash
curl -s http://localhost:8000/health
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"topic":"What is HTTP/3?"}' | jq '.session_id, .tool_calls, .evidence_count'
```

If auth is enabled, use a valid Bearer token from Stack Auth instead.

## Deliverables map

| Deliverable | Location |
|-------------|----------|
| Working agent | `Backend/` + `frontend/` + Docker Compose |
| Architecture decisions | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Eval suite + report | [eval/](../eval/) + [RESULTS.md](../eval/RESULTS.md) |
| Limitations write-up | [LIMITATIONS.md](LIMITATIONS.md) |
