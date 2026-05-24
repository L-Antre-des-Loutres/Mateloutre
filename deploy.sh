#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

[ -f channels.json ]         || echo '{}' > channels.json
[ -f otterlyApiRoutes.json ] || echo '[]' > otterlyApiRoutes.json
mkdir -p cache

if ! docker network inspect discord-bots-net >/dev/null 2>&1; then
    echo "Network 'discord-bots-net' not found. Start the docker-proxy compose first." >&2
    exit 1
fi

docker build --no-cache -t mateloutre:latest .
docker compose up -d

docker compose logs --tail=50 mateloutre