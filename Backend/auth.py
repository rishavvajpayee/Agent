import base64
import json
import logging
import os

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db import _get_conn

logger = logging.getLogger(__name__)

SKIP_AUTH = os.environ.get("SKIP_AUTH", "false").lower() == "true"

JWKS_URL = os.environ.get("JWKS_URL", "")
if not SKIP_AUTH and not JWKS_URL:
    raise ValueError("JWKS_URL is not set")

_security = HTTPBearer(auto_error=not SKIP_AUTH)
_jwks_client = PyJWKClient(JWKS_URL) if JWKS_URL else None

_DEV_USER = {"sub": "dev-user", "email": "dev@local"}


def _extract_access_token(raw_token: str) -> str:
    if raw_token.startswith("stackauth_") or raw_token.startswith("hexclave_"):
        prefix = "stackauth_" if raw_token.startswith("stackauth_") else "hexclave_"
        encoded = raw_token[len(prefix):]
        padding = "=" * (-len(encoded) % 4)
        auth_json = json.loads(base64.urlsafe_b64decode(encoded + padding))
        access_token = auth_json.get("accessToken")
        if not access_token:
            raise ValueError("Missing accessToken in Stack Auth authorization payload")
        return access_token
    return raw_token


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> dict:
    if SKIP_AUTH:
        return _DEV_USER

    token = _extract_access_token(credentials.credentials)
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            options={"verify_aud": False},
        )
    except Exception as exc:
        logger.warning("JWT validation failed: %s", exc)
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
