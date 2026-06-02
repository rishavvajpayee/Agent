"""Pytest setup for eval package — isolated env, no production .env."""

from __future__ import annotations

import os
import sys
import types
from pathlib import Path
from unittest.mock import MagicMock

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "Backend"
EVAL_DIR = Path(__file__).resolve().parent

# Unit tests must not load production DATABASE_URL from .env
os.environ["SERPER_API_KEY"] = "eval-test-key"
os.environ["ANTHROPIC_API_KEY"] = "eval-test-key"
os.environ["SKIP_AUTH"] = "true"
os.environ["DATABASE_URL"] = "postgresql://agent:agent@127.0.0.1:5432/agent"
os.environ["DATABASE_SSLMODE"] = "disable"

sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(EVAL_DIR))

# Stub db before Backend modules import it (avoids Postgres on import)
_mock_conn = MagicMock()
_mock_conn.__enter__ = MagicMock(return_value=_mock_conn)
_mock_conn.__exit__ = MagicMock(return_value=False)
_mock_cursor = MagicMock()
_mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=_mock_cursor)
_mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

_fake_db = types.ModuleType("db")
_fake_db._get_conn = MagicMock(return_value=_mock_conn)
_fake_db._ensure_tables = MagicMock()
_fake_db.DATABASE_URL = os.environ["DATABASE_URL"]
sys.modules["db"] = _fake_db
