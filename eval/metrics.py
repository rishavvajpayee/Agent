"""Scoring functions for the research agent eval suite."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

from brief_quality import (
    REQUIRED_SECTIONS,
    is_brief_complete_strict,
)

URL_PATTERN = re.compile(r"https?://[^\s\)\]>\",']+", re.IGNORECASE)


def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip().rstrip(".,;:)"))
    host = (parsed.netloc or "").lower()
    path = parsed.path.rstrip("/") or ""
    return f"{parsed.scheme.lower()}://{host}{path}"


def extract_urls(text: str) -> list[str]:
    return [normalize_url(match.group(0)) for match in URL_PATTERN.finditer(text)]


@dataclass
class TaskCompletionResult:
    passed: bool
    missing_sections: list[str] = field(default_factory=list)
    evidence_count: int = 0
    min_evidence: int = 3
    truncated: bool = False
    brief_length: int = 0


def score_task_completion(
    brief: str,
    evidence_count: int,
    truncated: bool,
    *,
    min_evidence: int = 3,
    min_length: int = 400,
) -> TaskCompletionResult:
    stripped = brief.strip()
    missing = [s for s in REQUIRED_SECTIONS if s not in stripped]
    passed = (
        is_brief_complete_strict(stripped, min_length=min_length)
        and evidence_count >= min_evidence
        and not truncated
        and len(missing) == 0
    )
    return TaskCompletionResult(
        passed=passed,
        missing_sections=missing,
        evidence_count=evidence_count,
        min_evidence=min_evidence,
        truncated=truncated,
        brief_length=len(stripped),
    )


@dataclass
class GroundingResult:
    cited_urls: list[str]
    allowed_urls: list[str]
    ungrounded_urls: list[str]
    hallucination_rate: float
    passed: bool


def score_grounding(
    brief: str,
    evidence_urls: list[str],
    *,
    max_hallucination_rate: float = 0.0,
) -> GroundingResult:
    allowed = {normalize_url(u) for u in evidence_urls if u}
    cited = extract_urls(brief)
    unique_cited = list(dict.fromkeys(cited))
    ungrounded = [u for u in unique_cited if u not in allowed]
    rate = len(ungrounded) / max(len(unique_cited), 1)
    passed = len(unique_cited) > 0 and rate <= max_hallucination_rate
    if len(unique_cited) == 0 and len(brief) > 300:
        passed = False
    return GroundingResult(
        cited_urls=unique_cited,
        allowed_urls=sorted(allowed),
        ungrounded_urls=ungrounded,
        hallucination_rate=rate,
        passed=passed,
    )


@dataclass
class GracefulFailureResult:
    passed: bool
    has_summary: bool
    has_findings_or_explanation: bool
    is_user_facing_error: bool


def score_graceful_failure(
    brief: str,
    *,
    truncated: bool = False,
    tool_calls: int = 0,
    max_tool_calls: int = 12,
) -> GracefulFailureResult:
    """Agent handled degraded conditions without crashing or returning empty output."""
    stripped = brief.strip()
    has_summary = "## Summary" in stripped
    has_findings = "## Key Findings" in stripped
    has_explanation = any(
        phrase in stripped.lower()
        for phrase in (
            "could not",
            "unable to",
            "limited evidence",
            "truncated",
            "timeout",
            "error",
            "insufficient",
        )
    )
    is_error_only = stripped.startswith("Agent stopped unexpectedly")
    is_user_facing_error = (
        "truncated due to length" in stripped.lower()
        or "please try a narrower" in stripped.lower()
    )
    passed = bool(stripped) and (
        (has_summary and (has_findings or has_explanation))
        or is_user_facing_error
    ) and not is_error_only
    if truncated or tool_calls >= max_tool_calls:
        passed = passed and has_summary
    return GracefulFailureResult(
        passed=passed,
        has_summary=has_summary,
        has_findings_or_explanation=has_findings or has_explanation,
        is_user_facing_error=is_user_facing_error,
    )
