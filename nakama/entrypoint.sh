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

if [ -z "$NAKAMA_DATABASE_ADDRESS" ]; then
  echo "nakama: missing database config. Set NAKAMA_DATABASE_ADDRESS, or link Render Postgres so DATABASE_URL is set." >&2
  exit 1
fi

exec /nakama/nakama \
  --name nakama \
  --logger.stdout true \
  --database.address "$NAKAMA_DATABASE_ADDRESS" \
  --socket.server_key "$NAKAMA_SERVER_KEY" \
  --socket.port "${PORT:-7350}" \
  --console.password "$NAKAMA_CONSOLE_PASSWORD" \
  --google_auth.credentials_json "$GOOGLE_CREDENTIALS_JSON"
