#!/bin/bash
set -e

# Fix permissions on /home/node if needed
# This ensures the node user can write to the Claude data volume
if [ "$(id -u)" = "0" ]; then
    # Running as root (during entrypoint setup)
    echo "Fixing permissions for node user..."
    chown -R node:node /home/node /workspace 2>/dev/null || true

    # Execute the command as the node user
    exec gosu node "$@"
else
    # Already running as node user
    exec "$@"
fi
