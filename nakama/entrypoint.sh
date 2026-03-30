#!/bin/sh
set -e

# Visible in Render logs — if you never see this line, the image entrypoint is not running
# (e.g. Render "Docker Command" overrides the container command, or an old image is deployed).
echo "[nakama-entrypoint] starting" >&2

# Strip Windows CRLF from values (Render dashboard / local edits)
strip_crlf() { printf '%s' "$1" | tr -d '\r'; }
trim_ws() { printf '%s' "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'; }

# Render: link Postgres so DATABASE_URL exists, OR set NAKAMA_DATABASE_ADDRESS.
if [ -z "$(trim_ws "$(strip_crlf "${NAKAMA_DATABASE_ADDRESS:-}")")" ] && [ -n "${DATABASE_URL:-}" ]; then
  addr="$(strip_crlf "$DATABASE_URL")"
  addr="${addr#postgresql://}"
  addr="${addr#postgres://}"
  export NAKAMA_DATABASE_ADDRESS="$addr"
fi

NAKAMA_DATABASE_ADDRESS="$(trim_ws "$(strip_crlf "${NAKAMA_DATABASE_ADDRESS:-}")")"
export NAKAMA_DATABASE_ADDRESS

case "$NAKAMA_DATABASE_ADDRESS" in
  postgresql://*|postgres://*)
    NAKAMA_DATABASE_ADDRESS="${NAKAMA_DATABASE_ADDRESS#postgresql://}"
    NAKAMA_DATABASE_ADDRESS="${NAKAMA_DATABASE_ADDRESS#postgres://}"
    export NAKAMA_DATABASE_ADDRESS
    ;;
esac

if [ -z "$NAKAMA_DATABASE_ADDRESS" ]; then
  echo "nakama: missing database config. Set NAKAMA_DATABASE_ADDRESS or DATABASE_URL (link Postgres)." >&2
  exit 1
fi

echo "[nakama-entrypoint] database.address length=${#NAKAMA_DATABASE_ADDRESS}" >&2

if [ -n "$GOOGLE_CREDENTIALS_JSON" ]; then
  GOOGLE_CREDENTIALS_JSON=$(printf '%s' "$GOOGLE_CREDENTIALS_JSON" | tr -d '\n\r')
  export GOOGLE_CREDENTIALS_JSON
fi

# Fresh Postgres has no Nakama schema — run migrations before starting the server.
echo "[nakama-entrypoint] running: nakama migrate up" >&2
/nakama/nakama migrate up \
  --database.address="$NAKAMA_DATABASE_ADDRESS" \
  --logger.stdout=true

# Use = form so argv is unambiguous; omit empty google flag (empty value can confuse parsers).
set -- /nakama/nakama \
  --name=nakama \
  --logger.stdout=true \
  --database.address="$NAKAMA_DATABASE_ADDRESS" \
  --socket.server_key="$NAKAMA_SERVER_KEY" \
  --socket.port="${PORT:-7350}" \
  --console.password="$NAKAMA_CONSOLE_PASSWORD"

if [ -n "$GOOGLE_CREDENTIALS_JSON" ]; then
  set -- "$@" --google_auth.credentials_json="$GOOGLE_CREDENTIALS_JSON"
fi

exec "$@"
