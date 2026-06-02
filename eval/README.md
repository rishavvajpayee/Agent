# Research Agent Eval Suite

Measures three quality dimensions for the research agent:

| Metric | Definition |
|--------|------------|
| **Task completion rate** | Share of runs passing strict brief checks: all five section headers, `evidence_count >= 3`, not truncated, minimum length 400. |
| **Hallucination / grounding** | Share of cited URLs in the brief that appear in `session_evidence` for that run (`hallucination_rate = ungrounded / cited`). |
| **Graceful failure handling** | Agent returns a non-empty, user-facing brief (Summary + Findings or explicit limitation) when tools fail or budget is exhausted — no crash-only messages. |

## Files

- `golden.json` — 25 research questions for live eval
- `failure_cases.json` — documented failure scenarios (covered by mocked tests)
- `metrics.py` — scoring functions
- `runner.py` — orchestrates pytest + optional live runs
- `test_metrics.py` / `test_failure_handling.py` — offline tests

## Run

```bash
pip install -r Backend/requirements.txt -r Backend/requirements-dev.txt

# Unit tests only (no API keys, no Postgres)
python eval/runner.py --unit-only

# Live golden set via Docker (recommended — uses compose Postgres + .env keys)
./eval/run_docker.sh --quick
./eval/run_docker.sh
```

For host-side live runs, point `DATABASE_URL` at the same Postgres as the backend (Docker: `postgresql://agent:agent@127.0.0.1:5432/agent` only if port 5432 is the compose service, not a local install).

Results are written to `eval/results.json`. Summarize in [RESULTS.md](RESULTS.md).
