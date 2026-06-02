#!/usr/bin/env bash
# Run live golden eval against Docker Postgres + API keys from .env
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Missing .env — copy .env.example and set API keys."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

docker compose run --rm --no-deps \
  -v "$ROOT/Backend:/app" \
  -v "$ROOT/eval:/eval" \
  -e DATABASE_URL="postgresql://${POSTGRES_USER:-agent}:${POSTGRES_PASSWORD:-agent}@postgres:5432/${POSTGRES_DB:-agent}" \
  -e DATABASE_SSLMODE=disable \
  -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
  -e SERPER_API_KEY="${SERPER_API_KEY}" \
  -e SKIP_AUTH=true \
  --entrypoint bash \
  backend \
  -c "pip install -q pytest && PYTHONPATH=/app:/eval python /eval/runner.py $*"
