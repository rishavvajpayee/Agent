import os
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db import _get_conn

SKIP_AUTH = os.environ.get("SKIP_AUTH", "false").lower() == "true"

JWKS_URL = os.environ.get("JWKS_URL", "")
if not SKIP_AUTH and not JWKS_URL:
    raise ValueError("JWKS_URL is not set")

_security = HTTPBearer(auto_error=not SKIP_AUTH)
_jwks_client = PyJWKClient(JWKS_URL) if JWKS_URL else None

_DEV_USER = {"sub": "dev-user", "email": "dev@local"}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> dict:
    if SKIP_AUTH:
        return _DEV_USER

    token = credentials.credentials
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _upsert_user(payload.get("sub"), payload.get("email"))
    return payload


def _upsert_user(stack_user_id: str, email: str | None) -> None:
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (stack_user_id, email)
                VALUES (%s, %s)
                ON CONFLICT (stack_user_id) DO UPDATE SET email = EXCLUDED.email
                """,
                (stack_user_id, email),
            )
        conn.commit()
