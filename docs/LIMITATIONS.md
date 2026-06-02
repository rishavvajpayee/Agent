# Where the Agent Breaks — and What It Takes to Fix

This document ties **observed failure modes** (from eval design, runtime guards, and architecture review) to **remediation effort**. Live golden-run scores are in [eval/RESULTS.md](../eval/RESULTS.md).

## Summary table

| Failure mode | Symptom | Severity | Fix effort | Primary fix |
|--------------|---------|----------|------------|-------------|
| Tool budget exhaustion | `truncated: true`, thin brief | High | Medium | Smarter budget allocation; async jobs for long research |
| Citation drift | URLs in brief not in `save_evidence` | High | Medium | Programmatic citation verifier + retry |
| Partial section compliance | Missing Contradictions / Confidence / Sources | Medium | Low | Extend runtime `is_brief_complete` to all five sections |
| `fetch_page` SSRF / abuse | Server fetches arbitrary URLs | Critical (security) | Medium | Allowlist, block private IPs, size caps |
| Search/fetch outages | Tool JSON errors; variable brief quality | Medium | Low–Medium | Circuit breakers, cached SERP results |
| Long session context | Slow, costly follow-ups | Medium | High | Summarize history; windowing |
| Sync worker saturation | Timeouts under load | High (scale) | High | Job queue + SSE progress |
| No offline eval in CI | Quality regressions undetected | Medium | Low | Wire `eval/runner.py --unit-only` into GitHub Actions |

---

## 1. Tool budget exhaustion (eval: task completion fails when `truncated`)

**What happens:** After 12 tool calls ([`MAX_TOOL_CALLS`](../Backend/session.py)), the agent enters force-synthesis mode. Briefs may lack depth or omit sections; `truncated` is surfaced in the UI.

**Evidence:** Eval task completion requires `truncated == false`. Golden runs on broad topics (e.g. market comparisons) often hit the cap.

**Fix:**

- Short term: Tune prompt to save evidence earlier (already in [`prompt.py`](../Backend/prompt.py)); raise cap slightly with cost monitoring.
- Medium: Dynamic budget by topic complexity.
- Long term: Background jobs so research is not bound to HTTP timeout.

**Effort:** Medium (prompt) → High (async platform).

---

## 2. Hallucination / ungrounded citations (eval: grounding metric)

**What happens:** The model cites URLs in Key Findings or Sources that were never saved via `save_evidence` (or never successfully fetched). Prompt says “never cite unfetched URLs” but this is not enforced in code.

**Evidence:** [`score_grounding`](../eval/metrics.py) compares extracted URLs in the brief to `session_evidence.source_url`. Failures are common when the model lists search-result URLs without `fetch_page` + `save_evidence`.

**Fix:**

- Post-process brief: strip or flag citations not in evidence table.
- Retry turn: “Remove or replace citations not in saved evidence: …”
- Optional LLM-as-judge in eval CI for regression gates.

**Effort:** Medium (1–2 weeks for verifier + retry path).

---

## 3. Incomplete brief structure (eval + runtime)

**What happens:** Runtime [`is_brief_complete`](../Backend/brief_quality.py) only checks Summary + Key Findings + length ≥ 200. Eval requires **all five** sections and length ≥ 400. Model may skip Contradictions or Confidence.

**Fix:** Align runtime check with eval (`is_brief_complete_strict`) and keep single retry with `BRIEF_RETRY_PROMPT`.

**Effort:** Low (hours).

---

## 4. External tool failures (eval: graceful failure suite)

**What happens:** Serper timeout, HTTP 404 on `fetch_page`, or empty page text. Tools return error strings (not exceptions); the agent usually continues.

**Evidence:** [`eval/test_failure_handling.py`](../eval/test_failure_handling.py) mocks timeouts/404s; mocked agent loop still returns a Summary.

**Remaining gaps:** No circuit breaker; repeated failures burn tool budget; no user-visible distinction between “search down” vs “topic too obscure.”

**Fix:** Retry with backoff at tool layer; structured error codes; degrade to “brief with limitations” template.

**Effort:** Low–Medium.

---

## 5. Session memory limits (product: follow-up quality)

**What happens:** Full message history is replayed each turn. Long sessions increase tokens, cost, and latency; old evidence may be diluted.

**Fix:** Rolling summary message; inject only recent turns + evidence summary; optional “new research” vs “follow-up only” mode.

**Effort:** High.

---

## 6. Security: SSRF via `fetch_page`

**What happens:** Backend requests any URL the model supplies—including metadata endpoints or internal IPs if reachable.

**Fix:** URL allowlist (https only), block RFC1918/link-local, max response size, DNS rebinding guards.

**Effort:** Medium (security review + tests).

---

## 7. Scale: synchronous `POST /chat`

**What happens:** One Uvicorn worker blocked 30s–2m per request; Postgres connection per operation without pooling.

**Fix:** See README “Production at scale”: queue, workers, PgBouncer, rate limits.

**Effort:** High (platform project).

---

## Eval-driven examples (failure case IDs)

| Case | Scenario | Expected behavior | Common break |
|------|----------|-------------------|--------------|
| f01 | Search timeout | Brief with Summary + limitation note | Burns calls retrying queries |
| f02 | fetch 404 | Skip source, continue | Loop wastes calls on same domain |
| f03 | 12 tools used | Force synthesis brief | `truncated`, thin Sources |
| f04 | 1 evidence row | Low confidence stated | Overconfident Key Findings |

---

## Recommended fix order (ROI)

1. Strict section check + citation verifier (quality, low–medium effort)
2. SSRF hardening (security)
3. Eval in CI (`python eval/runner.py --unit-only` + optional nightly live)
4. Async jobs + pooling (scale)

See also [ARCHITECTURE.md](ARCHITECTURE.md) for why the current stack was chosen before adding complexity.
