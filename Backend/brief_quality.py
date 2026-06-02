"""Shared brief structure checks for runtime and eval."""

REQUIRED_SECTIONS = [
    "## Summary",
    "## Key Findings",
    "## Contradictions & Debates",
    "## Confidence Assessment",
    "## Sources",
]

MIN_BRIEF_LENGTH = 200
MIN_BRIEF_LENGTH_STRICT = 400


def has_required_sections(text: str) -> bool:
    stripped = text.strip()
    return all(section in stripped for section in REQUIRED_SECTIONS)


def is_brief_complete(text: str, min_length: int = MIN_BRIEF_LENGTH) -> bool:
    """Runtime guard: Summary + Key Findings with minimum length."""
    stripped = text.strip()
    if len(stripped) < min_length:
        return False
    return "## Summary" in stripped and "## Key Findings" in stripped


def is_brief_complete_strict(text: str, min_length: int = MIN_BRIEF_LENGTH_STRICT) -> bool:
    """Eval guard: all five sections with minimum length."""
    stripped = text.strip()
    if len(stripped) < min_length:
        return False
    return has_required_sections(stripped)
