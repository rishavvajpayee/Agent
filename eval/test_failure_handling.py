"""Failure-injection tests for tools and agent degradation paths."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from metrics import score_graceful_failure


@pytest.fixture
def tools_module():
    import tools

    return tools


def test_web_search_returns_error_on_timeout(tools_module):
    with patch("tools.requests.post") as mock_post:
        mock_post.side_effect = __import__("requests").exceptions.Timeout()
        result = tools_module.web_search("test query")
    data = json.loads(result)
    assert "error" in data


def test_web_search_returns_error_on_exception(tools_module):
    with patch("tools.requests.post", side_effect=RuntimeError("network down")):
        result = tools_module.web_search("test query")
    data = json.loads(result)
    assert "error" in data


def test_fetch_page_returns_skip_message_on_404(tools_module):
    import requests

    with patch("tools.requests.get") as mock_get:
        response = MagicMock()
        http_error = requests.exceptions.HTTPError("404")
        http_error.response = MagicMock(status_code=404)
        mock_get.return_value = response
        response.raise_for_status.side_effect = http_error
        result = tools_module.fetch_page("https://example.com/missing")
    assert "404" in result


def test_run_tool_unknown_name():
    import tools

    assert "Unknown tool" in tools.run_tool("nonexistent_tool", {})


def test_graceful_failure_samples_from_failure_cases_json():
    from pathlib import Path

    cases_path = Path(__file__).parent / "failure_cases.json"
    assert cases_path.exists()


@patch("main.client")
def test_agent_completes_after_search_error(mock_client):
    """Mocked agent loop: search error then final brief."""
    import main

    tool_use_block = MagicMock()
    tool_use_block.type = "tool_use"
    tool_use_block.name = "web_search"
    tool_use_block.id = "toolu_1"
    tool_use_block.input = {"query": "test"}

    tool_response = MagicMock()
    tool_response.stop_reason = "tool_use"
    tool_response.content = [tool_use_block]
    tool_response.usage = MagicMock(input_tokens=100, output_tokens=50)

    text_block = MagicMock()
    text_block.text = """## Summary
Despite search failures, a brief was produced with limited evidence.

## Key Findings
• Unable to verify all claims due to search timeout.

## Contradictions & Debates
Not applicable.

## Confidence Assessment
Low confidence.

## Sources
(none)
"""

    final_response = MagicMock()
    final_response.stop_reason = "end_turn"
    final_response.content = [text_block]
    final_response.usage = MagicMock(input_tokens=200, output_tokens=400)

    mock_client.messages.create.side_effect = [tool_response, final_response]

    with patch("main.run_tool", return_value=json.dumps({"error": "Search request timed out"})):
        with patch("main.get_session_evidence", return_value=[]):
            with patch("main.append_message"):
                with patch("main.get_history", return_value=[]):
                    brief, tool_calls, _, truncated, evidence_count = main.run_agent(
                        "eval-mock-session",
                        "Test topic under search failure",
                        "eval-user",
                    )

    assert "## Summary" in brief
    assert tool_calls == 1
    graceful = score_graceful_failure(brief, truncated=truncated, tool_calls=tool_calls)
    assert graceful.passed


def test_force_synthesis_prompt_defined():
    """MAX_TOOL_CALLS and synthesis prompt are defined for budget exhaustion."""
    from session import MAX_TOOL_CALLS

    assert MAX_TOOL_CALLS == 12
    force_prompt = (
        "You have reached the maximum number of tool calls. "
        "Please synthesize the evidence you have gathered so far and write the final research brief now."
    )
    assert "synthesize" in force_prompt.lower()
