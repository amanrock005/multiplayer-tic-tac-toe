FROM heroiclabs/nakama:3.22.0

# Copy Lua modules. Paths are relative to the Docker *build context* (usually repo root on Render).
# If you set Render "Root Directory" to `nakama`, change this line to: COPY modules /nakama/data/modules
COPY nakama/modules /nakama/data/modules

# Render sets $PORT at runtime. JSON-array CMD does not run a shell, so ${VARS}
# would be passed literally — use sh -c for expansion.
# If GOOGLE_CREDENTIALS_JSON breaks quoting (rare), store it as a single-line
# string in Render or use a base64-encoded value + decode in a custom entrypoint.
CMD ["/bin/sh", "-c", "exec /nakama/nakama --name nakama --logger.stdout true --database.address \"$NAKAMA_DATABASE_ADDRESS\" --socket.server_key \"$NAKAMA_SERVER_KEY\" --socket.port \"${PORT:-7350}\" --console.password \"$NAKAMA_CONSOLE_PASSWORD\" --google_auth.credentials_json \"$GOOGLE_CREDENTIALS_JSON\""]
