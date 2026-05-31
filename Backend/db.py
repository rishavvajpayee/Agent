import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "")


def _get_conn():
    return psycopg2.connect(DATABASE_URL, sslmode="require")


def _ensure_tables():
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id            SERIAL PRIMARY KEY,
                    stack_user_id TEXT UNIQUE NOT NULL,
                    email         TEXT,
                    created_at    TIMESTAMPTZ DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id          SERIAL PRIMARY KEY,
                    user_id     TEXT NOT NULL REFERENCES users(stack_user_id),
                    session_id  TEXT NOT NULL,
                    role        TEXT NOT NULL,
                    content     TEXT NOT NULL,
                    created_at  TIMESTAMPTZ DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id
                    ON chat_sessions (session_id);

                INSERT INTO users (stack_user_id, email)
                VALUES ('dev-user', 'dev@local')
                ON CONFLICT (stack_user_id) DO NOTHING;
            """)
        conn.commit()


_ensure_tables()
