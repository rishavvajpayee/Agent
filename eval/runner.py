#!/usr/bin/env python3
"""
Run the research agent eval suite against golden questions.

Usage:
  python eval/runner.py --unit-only          # no API calls (pytest only)
  python eval/runner.py --quick              # 3 golden cases (live)
  python eval/runner.py                      # full golden set (live)
  python eval/runner.py --output eval/results.json
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "Backend"
EVAL_DIR = Path(__file__).resolve().parent

sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(EVAL_DIR))

EVAL_USER_ID = "eval-user"


def _ensure_eval_user() -> None:
    from db import _get_conn

    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (stack_user_id, email)
                VALUES (%s, %s)
                ON CONFLICT (stack_user_id) DO NOTHING
                """,
                (EVAL_USER_ID, "eval@local"),
            )
        conn.commit()


def _load_golden(quick: bool) -> list[dict]:
    data = json.loads((EVAL_DIR / "golden.json").read_text())
    cases = data["cases"]
    if quick:
        return cases[:3]
    return cases


def _run_live_case(case: dict, defaults: dict) -> dict:
    from session import clear_history, get_session_evidence
    from main import run_agent
    from metrics import score_graceful_failure, score_grounding, score_task_completion

    session_id = f"eval-{case['id']}-{uuid.uuid4().hex[:8]}"
    clear_history(session_id, user_id=EVAL_USER_ID)

    brief, tool_calls, tokens_used, truncated, evidence_count = run_agent(
        session_id, case["topic"], EVAL_USER_ID
    )
    evidence = get_session_evidence(session_id, EVAL_USER_ID)
    evidence_urls = [e["source_url"] for e in evidence]

    task = score_task_completion(
        brief,
        evidence_count,
        truncated,
        min_evidence=defaults.get("min_evidence", 3),
        min_length=defaults.get("min_brief_length", 400),
    )
    grounding = score_grounding(
        brief,
        evidence_urls,
        max_hallucination_rate=defaults.get("max_hallucination_rate", 0.0),
    )
    graceful = score_graceful_failure(
        brief, truncated=truncated, tool_calls=tool_calls
    )

    return {
        "id": case["id"],
        "topic": case["topic"],
        "session_id": session_id,
        "tool_calls": tool_calls,
        "tokens_used": tokens_used,
        "truncated": truncated,
        "evidence_count": evidence_count,
        "task_completion_passed": task.passed,
        "grounding_passed": grounding.passed,
        "hallucination_rate": grounding.hallucination_rate,
        "ungrounded_urls": grounding.ungrounded_urls,
        "graceful_failure_passed": graceful.passed,
        "missing_sections": task.missing_sections,
        "brief_length": task.brief_length,
    }


def _aggregate(results: list[dict]) -> dict:
    n = len(results) or 1
    return {
        "case_count": len(results),
        "task_completion_rate": sum(1 for r in results if r["task_completion_passed"]) / n,
        "grounding_pass_rate": sum(1 for r in results if r["grounding_passed"]) / n,
        "mean_hallucination_rate": sum(r["hallucination_rate"] for r in results) / n,
        "graceful_failure_rate": sum(1 for r in results if r["graceful_failure_passed"]) / n,
        "truncation_rate": sum(1 for r in results if r.get("truncated")) / n,
    }


def run_pytest_unit() -> int:
    cmd = [
        sys.executable,
        "-m",
        "pytest",
        str(EVAL_DIR / "test_metrics.py"),
        str(EVAL_DIR / "test_failure_handling.py"),
        "-q",
    ]
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{BACKEND_DIR}{os.pathsep}{EVAL_DIR}"
    # Avoid production DATABASE_URL from shell/.env during unit tests
    env["DATABASE_URL"] = "postgresql://agent:agent@127.0.0.1:5432/agent"
    env["DATABASE_SSLMODE"] = "disable"
    env.setdefault("SERPER_API_KEY", "eval-test-key")
    env.setdefault("ANTHROPIC_API_KEY", "eval-test-key")
    env.setdefault("SKIP_AUTH", "true")
    return subprocess.call(cmd, env=env)


def main() -> int:
    parser = argparse.ArgumentParser(description="Research agent eval runner")
    parser.add_argument("--quick", action="store_true", help="Run first 3 golden cases only")
    parser.add_argument("--unit-only", action="store_true", help="Run pytest only, no live agent")
    parser.add_argument("--output", default=str(EVAL_DIR / "results.json"), help="JSON output path")
    args = parser.parse_args()

    unit_code = run_pytest_unit()
    if unit_code != 0:
        return unit_code

    if args.unit_only:
        print("Unit tests passed (metrics + failure handling).")
        return 0

    from dotenv import load_dotenv

    load_dotenv(REPO_ROOT / ".env")

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY not set; skipping live golden runs.", file=sys.stderr)
        return 0
    if not os.environ.get("SERPER_API_KEY"):
        print("SERPER_API_KEY not set; skipping live golden runs.", file=sys.stderr)
        return 0
    if not os.environ.get("DATABASE_URL"):
        os.environ.setdefault(
            "DATABASE_URL",
            "postgresql://agent:agent@localhost:5432/agent",
        )
        os.environ.setdefault("DATABASE_SSLMODE", "disable")

    _ensure_eval_user()
    golden = json.loads((EVAL_DIR / "golden.json").read_text())
    cases = _load_golden(args.quick)
    defaults = golden.get("defaults", {})

    print(f"Running {len(cases)} live golden case(s)...")
    results = []
    for i, case in enumerate(cases, 1):
        print(f"  [{i}/{len(cases)}] {case['id']}: {case['topic'][:60]}...")
        try:
            results.append(_run_live_case(case, defaults))
        except Exception as exc:
            results.append({
                "id": case["id"],
                "topic": case["topic"],
                "error": str(exc),
                "task_completion_passed": False,
                "grounding_passed": False,
                "graceful_failure_passed": False,
                "hallucination_rate": 1.0,
            })

    summary = _aggregate(results)
    payload = {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "mode": "quick" if args.quick else "full",
        "summary": summary,
        "results": results,
    }
    out_path = Path(args.output)
    out_path.write_text(json.dumps(payload, indent=2))
    print(json.dumps(summary, indent=2))
    print(f"Wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
