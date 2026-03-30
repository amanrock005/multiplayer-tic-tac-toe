FROM heroiclabs/nakama:3.22.0

# Copy your Lua modules into Nakama's default module path.
COPY ./modules /nakama/data/modules

# Render expects the app to listen on $PORT.
# We pass config via flags so it works cleanly on Render.
CMD ["/nakama/nakama",
  "--name", "nakama",
  "--logger.stdout", "true",
  "--database.address", "${NAKAMA_DATABASE_ADDRESS}",
  "--socket.server_key", "${NAKAMA_SERVER_KEY}",
  "--socket.port", "${PORT}",
  "--console.password", "${NAKAMA_CONSOLE_PASSWORD}",
  "--google_auth.credentials_json", "${GOOGLE_CREDENTIALS_JSON}"
]