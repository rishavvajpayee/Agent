"""Unit tests for eval scoring metrics."""

from metrics import (
    extract_urls,
    normalize_url,
    score_graceful_failure,
    score_grounding,
    score_task_completion,
)

SAMPLE_BRIEF = """## Summary
Test overview with enough content to exceed minimum length requirements for evaluation scoring functions in the research agent project.

## Key Findings
• Finding one [Source: https://example.com/a]
• Finding two [Source: https://example.com/b]

## Contradictions & Debates
Sources disagree on timing.

## Confidence Assessment
Medium confidence due to limited samples.

## Sources
1. https://example.com/a
2. https://example.com/b
"""


def test_normalize_url_strips_trailing_punctuation():
    assert normalize_url("https://Example.com/path/,") == "https://example.com/path"


def test_extract_urls_from_brief():
    urls = extract_urls(SAMPLE_BRIEF)
    assert "https://example.com/a" in urls
    assert "https://example.com/b" in urls


def test_task_completion_passes_complete_brief():
    result = score_task_completion(
        SAMPLE_BRIEF,
        evidence_count=3,
        truncated=False,
        min_evidence=3,
    )
    assert result.passed
    assert result.missing_sections == []


def test_task_completion_fails_when_truncated():
    result = score_task_completion(
        SAMPLE_BRIEF,
        evidence_count=5,
        truncated=True,
    )
    assert not result.passed


def test_task_completion_fails_missing_sections():
    brief = "## Summary\nShort.\n"
    result = score_task_completion(brief, evidence_count=3, truncated=False)
    assert not result.passed
    assert "## Key Findings" in result.missing_sections


def test_grounding_passes_when_urls_match_evidence():
    evidence = ["https://example.com/a", "https://example.com/b"]
    result = score_grounding(SAMPLE_BRIEF, evidence)
    assert result.passed
    assert result.hallucination_rate == 0.0
    assert result.ungrounded_urls == []


def test_grounding_fails_on_ungrounded_citation():
    brief = SAMPLE_BRIEF + "\nExtra [Source: https://fabricated.com/x]"
    result = score_grounding(brief, ["https://example.com/a"])
    assert not result.passed
    assert "https://fabricated.com/x" in result.ungrounded_urls


def test_graceful_failure_passes_structured_truncated_brief():
    brief = """## Summary
Research was limited due to tool budget exhaustion.

## Key Findings
• Limited evidence available [Source: https://example.com/a]

## Contradictions & Debates
Insufficient data.

## Confidence Assessment
Low confidence.

## Sources
1. https://example.com/a
"""
    result = score_graceful_failure(brief, truncated=True, tool_calls=12)
    assert result.passed


def test_graceful_failure_fails_on_crash_message():
    result = score_graceful_failure("Agent stopped unexpectedly (reason: unknown)")
    assert not result.passed
