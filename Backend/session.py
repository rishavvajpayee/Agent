from psycopg2.extras import RealDictCursor
from db import _get_conn

MODEL = "claude-haiku-4-5"
MAX_TOKENS = 4096
MAX_TOOL_CALLS = 12


def get_history(session_id: str) -> list[dict]:
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT role, content FROM chat_sessions "
                "WHERE session_id = %s ORDER BY created_at ASC",
                (session_id,),
            )
            rows = cur.fetchall()
    return [{"role": row["role"], "content": row["content"]} for row in rows]


def append_message(session_id: str, message: str, role: str = "user", user_id: str = "dev-user"):
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO chat_sessions (session_id, role, content, user_id) VALUES (%s, %s, %s, %s)",
                (session_id, role, message, user_id),
            )
        conn.commit()


def clear_history(session_id: str):
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM chat_sessions WHERE session_id = %s", (session_id,)
            )
        conn.commit()


def list_sessions() -> list[str]:
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT session_id FROM chat_sessions ORDER BY session_id"
            )
            rows = cur.fetchall()
    return [row[0] for row in rows]
