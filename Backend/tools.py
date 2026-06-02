import os
import json
import requests
from contextvars import ContextVar
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from typing import Any

load_dotenv()

_tool_session_id: ContextVar[str | None] = ContextVar("tool_session_id", default=None)
_tool_user_id: ContextVar[str | None] = ContextVar("tool_user_id", default=None)


def set_tool_context(session_id: str, user_id: str) -> None:
    _tool_session_id.set(session_id)
    _tool_user_id.set(user_id)


def clear_tool_context() -> None:
    _tool_session_id.set(None)
    _tool_user_id.set(None)

SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "")
SERPER_URL = "https://google.serper.dev/search"

if not SERPER_API_KEY:
    raise ValueError("SERPER_API_KEY is not set")

if not SERPER_URL:
    raise ValueError("SERPER_URL is not set")

TOOL_DEFINITIONS = [
    {
        "name": "web_search",
        "description": (
            "Search the web for a query and return the top 4 results. "
            "Each result includes title, snippet, and URL. "
            "Call this once per research angle to gather source candidates."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query string, e.g. 'effects of sleep deprivation on memory 2023'",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "fetch_page",
        "description": (
            "Fetch the text content of a web page given its URL. "
            "Returns the first 4000 characters of readable text. "
            "Use this to read promising sources found via web_search. "
            "If the page is blocked or empty, move on to the next source."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The full URL to fetch, e.g. 'https://example.com/article'",
                },
            },
            "required": ["url"],
        },
    },
    {
        "name": "save_evidence",
        "description": (
            "Save an important piece of evidence (a claim + supporting quote) "
            "from a source you have already fetched. "
            "Save 3-6 of the strongest claims before writing the brief — not every minor detail. "
            "Never cite a URL you haven't retrieved via fetch_page."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "source_url": {
                    "type": "string",
                    "description": "The URL of the source that contains this evidence.",
                },
                "key_claim": {
                    "type": "string",
                    "description": "A concise statement of the finding (1-2 sentences).",
                },
                "quote": {
                    "type": "string",
                    "description": "A short verbatim or near-verbatim excerpt from the source supporting the claim.",
                },
            },
            "required": ["source_url", "key_claim", "quote"],
        },
    },
]


def web_search(query: str) -> str:
    if not SERPER_API_KEY:
        return json.dumps({"error": "SERPER_API_KEY is not set"})

    try:
        response = requests.post(
            SERPER_URL,
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get("organic", [])[:4]:
            results.append({
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "url": item.get("link", ""),
            })

        return json.dumps({"query": query, "results": results}, indent=2)

    except requests.exceptions.Timeout:
        return json.dumps({"error": "Search request timed out"})
    except Exception as e:
        return json.dumps({"error": f"Search failed: {str(e)}"})


def fetch_page(url: str) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    try:
        response = requests.get(url, headers=headers, timeout=12)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        text = soup.get_text(separator=" ", strip=True)
        import re
        text = re.sub(r"\s+", " ", text).strip()

        if not text:
            return f"[fetch_page] No readable text found at {url}"

        return f"[Source: {url}]\n\n{text[:4000]}"

    except requests.exceptions.Timeout:
        return f"[fetch_page] Request timed out for {url}"
    except requests.exceptions.HTTPError as e:
        return f"[fetch_page] HTTP error {e.response.status_code} for {url} — skipping this source"
    except Exception as e:
        return f"[fetch_page] Failed to fetch {url}: {str(e)}"


def save_evidence(source_url: str, key_claim: str, quote: str) -> str:
    from session import append_evidence

    session_id = _tool_session_id.get()
    user_id = _tool_user_id.get()
    if session_id and user_id:
        append_evidence(session_id, user_id, source_url, key_claim, quote)

    return (
        f"[Evidence saved]\n"
        f"Source: {source_url}\n"
        f"Claim: {key_claim}\n"
        f"Quote: \"{quote}\""
    )

def run_tool(tool_name: str, tool_input: dict[str, Any]) -> str:
    if tool_name == "web_search":
        return web_search(tool_input["query"])
    elif tool_name == "fetch_page":
        return fetch_page(tool_input["url"])
    elif tool_name == "save_evidence":
        return save_evidence(
            tool_input["source_url"],
            tool_input["key_claim"],
            tool_input["quote"],
        )
    else:
        return f"[run_tool] Unknown tool: {tool_name}"