FROM heroiclabs/nakama:3.22.0

# Copy Lua modules. Paths are relative to the Docker *build context* (usually repo root on Render).
# If you set Render "Root Directory" to `nakama`, change this line to: COPY modules /nakama/data/modules
COPY nakama/modules /nakama/data/modules
COPY nakama/entrypoint.sh /entrypoint.sh
# Windows CRLF breaks #!/bin/sh — strip CR so the entrypoint always runs.
RUN awk '{gsub(/\r/,""); print}' /entrypoint.sh >/entrypoint.tmp && mv /entrypoint.tmp /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
# Clear base image CMD so nothing extra is passed to the entrypoint.
CMD []
