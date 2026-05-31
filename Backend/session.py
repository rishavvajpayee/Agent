from typing import Dict

MODEL = "claude-opus-4-5"
MAX_TOKENS = 4096
MAX_TOOL_CALLS = 12

_sessions: Dict[str, list[dict]] = {}

def get_history(session_id) -> list[dict]:
    if session_id not in _sessions:
        _sessions[session_id] = []
    return _sessions[session_id]

def append_message(session_id, message, role: str = "user"):
    if session_id not in _sessions:
        _sessions[session_id] = []
    _sessions[session_id].append({"role": role, "content": message})

def clear_history(session_id):
    if session_id in _sessions:
        del _sessions[session_id]

def list_sessions() -> list[str]:
    return list(_sessions.keys())