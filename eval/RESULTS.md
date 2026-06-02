# Eval Results

Methodology and baseline scores for the Research Agent eval suite. Definitions match [README.md](README.md).

## Methodology

| Metric | Pass criteria |
|--------|----------------|
| **Task completion** | All five section headers present, brief length ≥ 400, `evidence_count ≥ 3`, `truncated == false` |
| **Grounding** | Every URL extracted from the brief appears in `session_evidence` for that run (`hallucination_rate == 0`) |
| **Graceful failure** | Non-empty brief with `## Summary` and (`## Key Findings` or explicit limitation language); not a crash-only message |

**Offline suite (no API cost):** 16 pytest cases — metric scoring + mocked tool failures + mocked agent loop after search timeout.

**Live suite:** Golden questions from [`golden.json`](golden.json). Run via Docker (recommended):

```bash
./eval/run_docker.sh --quick    # 3 cases
./eval/run_docker.sh            # all 25 cases
```

Unit tests only:

```bash
python eval/runner.py --unit-only
```

## Offline results (always reproducible)

| Suite | Tests | Pass rate |
|-------|-------|-----------|
| `test_metrics.py` | 9 | 100% |
| `test_failure_handling.py` | 7 | 100% |
| **Total** | **16** | **100%** |

Covers: URL normalization, task/grounding/graceful scorers, Serper timeout JSON, `fetch_page` 404 message, unknown tool handling, mocked agent completion after search error.

## Live golden run — quick (3 cases)

**Run at:** 2026-06-02 (UTC) · **Mode:** `--quick` · **Model:** `claude-haiku-4-5` · **Raw:** [`results.json`](results.json)

| Metric | Score |
|--------|-------|
| Task completion rate | **66.7%** (2/3) |
| Grounding pass rate | **100%** (3/3) |
| Mean hallucination rate | **0%** |
| Graceful failure rate | **100%** (3/3) |
| Truncation rate | **33.3%** (1/3) |

### Per-case

| ID | Topic (short) | Task | Grounding | Graceful | Truncated | Evidence |
|----|---------------|------|-----------|----------|-----------|----------|
| g01 | Intermittent fasting benefits/risks | Fail | Pass | Pass | Yes | 4 |
| g02 | Postgres vs MongoDB for chat | Pass | Pass | Pass | No | 4 |
| g03 | EU AI Act enforcement 2025 | Pass | Pass | Pass | No | 5 |

**g01 failure driver:** Hit 12-tool budget (`truncated: true`) despite complete sections and 4 evidence rows. Task completion metric intentionally treats truncation as failure.

**Interpretation:** Grounding prompt + `save_evidence` discipline held for this sample (no ungrounded URLs). Main quality gap is **budget exhaustion** on broader health topics, not citation fabrication in these runs.

## Full golden set (25 cases)

Not run in CI by default (cost and time). To generate:

```bash
./eval/run_docker.sh --output eval/results-full.json
```

Expect lower task completion on wide topics if the agent spends the tool budget on search/fetch before synthesis.

## Regression gate (recommended)

1. `python eval/runner.py --unit-only` on every PR
2. Nightly or manual `./eval/run_docker.sh --quick` with score thresholds (e.g. grounding ≥ 90%, graceful ≥ 90%)

See [docs/LIMITATIONS.md](../docs/LIMITATIONS.md) for failure modes and fixes.
