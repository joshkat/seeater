#!/usr/bin/env bash
# Builds the production image on the ZimaOS box and (re)starts the container.
#
#   scripts/deploy-zima.sh                 # josh@192.168.1.194, port 8090
#   ZIMA_HOST=me@host ZIMA_PORT=8100 scripts/deploy-zima.sh
#
# The box builds the image itself (no Docker needed on this machine): the
# working tree is streamed over SSH, minus everything .dockerignore drops.
# The container is a plain one, so Portainer lists it under Containers.
set -euo pipefail

HOST="${ZIMA_HOST:-josh@192.168.1.194}"
PORT="${ZIMA_PORT:-8090}"
REMOTE_DIR="${ZIMA_DIR:-/DATA/AppData/seeater/src}"

cd "$(dirname "$0")/.."

echo "→ copying source to $HOST:$REMOTE_DIR"
COPYFILE_DISABLE=1 tar \
  --exclude=node_modules --exclude=dist --exclude=.git --exclude=.claude \
  --exclude=.env --exclude=.env.local --exclude='*.tsbuildinfo' --exclude=.DS_Store \
  --exclude=apps/api/src/generated --exclude=docs --exclude=apps/e2e/test-results \
  -czf - . |
  ssh "$HOST" "rm -rf '$REMOTE_DIR' && mkdir -p '$REMOTE_DIR' && tar -xzf - -C '$REMOTE_DIR' 2>/dev/null"

echo "→ building and starting the container"
# DOCKER_CONFIG: ZimaOS's /DATA/.docker/config.json isn't readable by this user.
ssh "$HOST" "export DOCKER_CONFIG=/tmp/docker-config-\$(id -u)
  set -e
  cd '$REMOTE_DIR'
  old=\$(docker images -q seeater:latest)
  docker build -q -t seeater:latest . >/dev/null
  docker rm -f seeater >/dev/null 2>&1 || true
  docker run -d --name seeater --restart unless-stopped \
    --read-only --cap-drop ALL --security-opt no-new-privileges:true --memory 64m \
    -p $PORT:8080 seeater:latest >/dev/null
  new=\$(docker images -q seeater:latest)
  if [ -n \"\$old\" ] && [ \"\$old\" != \"\$new\" ]; then docker rmi \"\$old\" >/dev/null 2>&1 || true; fi
  docker images seeater:latest --format 'seeater:latest {{.Size}}'"

echo "✓ http://${HOST#*@}:$PORT"
