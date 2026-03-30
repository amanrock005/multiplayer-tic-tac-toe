#!/bin/sh
set -e

# Render: link Postgres to this service so DATABASE_URL is injected, OR set
# NAKAMA_DATABASE_ADDRESS manually to: user:password@host:5432/database
# (no postgres:// prefix — Nakama adds it.)
if [ -z "$NAKAMA_DATABASE_ADDRESS" ] && [ -n "$DATABASE_URL" ]; then
  addr="${DATABASE_URL#postgresql://}"
  addr="${addr#postgres://}"
  export NAKAMA_DATABASE_ADDRESS="$addr"
fi

# If you pasted a full postgres URL into NAKAMA_DATABASE_ADDRESS, strip the scheme
# (Nakama expects user:pass@host:port/db — it appends postgres:// itself).
case "$NAKAMA_DATABASE_ADDRESS" in
  postgresql://*|postgres://*)
    NAKAMA_DATABASE_ADDRESS="${NAKAMA_DATABASE_ADDRESS#postgresql://}"
    NAKAMA_DATABASE_ADDRESS="${NAKAMA_DATABASE_ADDRESS#postgres://}"
    export NAKAMA_DATABASE_ADDRESS
    ;;
esac

if [ -z "$NAKAMA_DATABASE_ADDRESS" ]; then
  echo "nakama: missing database config. Set NAKAMA_DATABASE_ADDRESS, or link Render Postgres so DATABASE_URL is set." >&2
  exit 1
fi

# Render’s UI may wrap long values; pasting pretty-printed JSON can insert real newlines.
# Strip them so the OAuth client JSON is one continuous string for Nakama.
if [ -n "$GOOGLE_CREDENTIALS_JSON" ]; then
  GOOGLE_CREDENTIALS_JSON=$(printf '%s' "$GOOGLE_CREDENTIALS_JSON" | tr -d '\n\r')
  export GOOGLE_CREDENTIALS_JSON
fi

exec /nakama/nakama \
  --name nakama \
  --logger.stdout true \
  --database.address "$NAKAMA_DATABASE_ADDRESS" \
  --socket.server_key "$NAKAMA_SERVER_KEY" \
  --socket.port "${PORT:-7350}" \
  --console.password "$NAKAMA_CONSOLE_PASSWORD" \
  --google_auth.credentials_json "$GOOGLE_CREDENTIALS_JSON"
