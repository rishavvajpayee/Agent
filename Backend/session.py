from psycopg2.extras import RealDictCursor
from db import _get_conn

MODEL = "claude-haiku-4-5"
MAX_TOKENS = 4096
MAX_TOOL_CALLS = 12


def get_history(session_id: str, user_id: str | None = None) -> list[dict]:
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if user_id:
                cur.execute(
                    "SELECT role, content FROM chat_sessions "
                    "WHERE session_id = %s AND user_id = %s ORDER BY created_at ASC",
                    (session_id, user_id),
                )
            else:
                cur.execute(
                    "SELECT role, content FROM chat_sessions "
                    "WHERE session_id = %s ORDER BY created_at ASC",
                    (session_id,),
                )
            rows = cur.fetchall()
    return [{"role": row["role"], "content": row["content"]} for row in rows]


def get_session_messages(session_id: str, user_id: str) -> list[dict]:
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT role, content, created_at
                FROM chat_sessions
                WHERE session_id = %s AND user_id = %s
                ORDER BY created_at ASC
                """,
                (session_id, user_id),
            )
            rows = cur.fetchall()
    return [
        {
            "role": row["role"],
            "content": row["content"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def session_belongs_to_user(session_id: str, user_id: str) -> bool:
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM chat_sessions WHERE session_id = %s AND user_id = %s LIMIT 1",
                (session_id, user_id),
            )
            return cur.fetchone() is not None


def session_id_available_for_user(session_id: str, user_id: str) -> bool:
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM chat_sessions WHERE session_id = %s LIMIT 1",
                (session_id,),
            )
            row = cur.fetchone()
    return row is None or row[0] == user_id


def append_message(session_id: str, message: str, role: str = "user", user_id: str = "dev-user"):
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO chat_sessions (session_id, role, content, user_id) VALUES (%s, %s, %s, %s)",
                (session_id, role, message, user_id),
            )
        conn.commit()


def clear_history(session_id: str, user_id: str | None = None) -> int:
    with _get_conn() as conn:
        with conn.cursor() as cur:
            if user_id:
                cur.execute(
                    "DELETE FROM chat_sessions WHERE session_id = %s AND user_id = %s",
                    (session_id, user_id),
                )
            else:
                cur.execute(
                    "DELETE FROM chat_sessions WHERE session_id = %s",
                    (session_id,),
                )
            deleted = cur.rowcount
        conn.commit()
    return deleted


def list_sessions(user_id: str) -> list[dict]:
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    session_id,
                    COUNT(*)::int AS message_count,
                    MIN(created_at) AS created_at,
                    MAX(created_at) AS updated_at,
                    (
                        SELECT content
                        FROM chat_sessions first_user
                        WHERE first_user.session_id = cs.session_id
                          AND first_user.user_id = %s
                          AND first_user.role = 'user'
                        ORDER BY first_user.created_at ASC
                        LIMIT 1
                    ) AS title
                FROM chat_sessions cs
                WHERE user_id = %s
                GROUP BY session_id
                ORDER BY MAX(created_at) DESC
                """,
                (user_id, user_id),
            )
            rows = cur.fetchall()
    return [
        {
            "session_id": row["session_id"],
            "title": _truncate_title(row["title"]),
            "message_count": row["message_count"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }
        for row in rows
    ]


def _truncate_title(title: str | None, max_len: int = 80) -> str | None:
    if not title:
        return None
    text = title.strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"
