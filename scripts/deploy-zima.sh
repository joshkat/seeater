#!/usr/bin/env bash
# Builds the production images on the ZimaOS box and (re)starts them.
#
#   scripts/deploy-zima.sh                 # local-only web container on :8090
#   scripts/deploy-zima.sh --stack         # public stack: web + api + postgres +
#                                          # cloudflared (docker/compose.yml)
#   ZIMA_HOST=me@host ZIMA_PORT=8100 scripts/deploy-zima.sh
#
# The box builds the images itself (no Docker needed on this machine): the
# working tree is streamed over SSH, minus everything .dockerignore drops.
#
# Default mode runs one plain container, `seeater` (Portainer lists it under
# Containers): the local-only app, sync off.
#
# --stack runs docker/compose.yml as the compose project `seeater` and removes
# the standalone container (the stack's web takes its place). Settings come
# from docker/.env (see docker/.env.example and docs/hosting.md): when it
# exists here it is copied to $ZIMA_BASE/stack.env on the box (mode 600);
# otherwise the copy already on the box is used. The two modes are
# alternatives: both want port 8090.
set -euo pipefail

MODE=single
case "${1:-}" in
  --stack) MODE=stack ;;
  "") ;;
  *)
    echo "usage: $0 [--stack]" >&2
    exit 2
    ;;
esac

HOST="${ZIMA_HOST:-josh@192.168.1.194}"
PORT="${ZIMA_PORT:-8090}"
BASE="${ZIMA_BASE:-/DATA/AppData/seeater}"
REMOTE_DIR="${ZIMA_DIR:-$BASE/src}"
ENV_FILE="$BASE/stack.env"

cd "$(dirname "$0")/.."

if [ "$MODE" = stack ]; then
  if [ -f docker/.env ]; then
    echo "→ copying docker/.env to $HOST:$ENV_FILE"
    ssh "$HOST" "umask 077 && mkdir -p '$BASE' && cat > '$ENV_FILE'" <docker/.env
  elif ! ssh "$HOST" "test -s '$ENV_FILE'"; then
    echo "✗ no docker/.env here and no $ENV_FILE on the box (see docker/.env.example)" >&2
    exit 1
  fi
fi

echo "→ copying source to $HOST:$REMOTE_DIR"
COPYFILE_DISABLE=1 tar \
  --exclude=node_modules --exclude=dist --exclude=.git --exclude=.claude \
  --exclude=.env --exclude=.env.local --exclude='*.tsbuildinfo' --exclude=.DS_Store \
  --exclude=apps/api/src/generated --exclude=docs --exclude=apps/e2e/test-results \
  -czf - . |
  ssh "$HOST" "rm -rf '$REMOTE_DIR' && mkdir -p '$REMOTE_DIR' && tar -xzf - -C '$REMOTE_DIR' 2>/dev/null"

# DOCKER_CONFIG: ZimaOS's /DATA/.docker/config.json isn't readable by this user.
REMOTE_PRELUDE="export DOCKER_CONFIG=/tmp/docker-config-\$(id -u)
  set -e
  cd '$REMOTE_DIR'"

if [ "$MODE" = single ]; then
  echo "→ building and starting the container"
  ssh "$HOST" "$REMOTE_PRELUDE
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
  exit 0
fi

echo "→ building the images and starting the stack"
# The images are built with plain `docker build` (what works on the box, with
# or without BuildKit); the web build args must match docker/compose.yml's
# `web.build.args`. Compose is a CLI plugin, found via DOCKER_CONFIG, so the
# user's plugins folder is linked into the substitute config dir when it can
# be read; else a system-wide plugin or a standalone docker-compose is used.
ssh "$HOST" "$REMOTE_PRELUDE
  mkdir -p \"\$DOCKER_CONFIG\"
  if [ ! -e \"\$DOCKER_CONFIG/cli-plugins\" ] && [ -r \"\$HOME/.docker/cli-plugins\" ]; then
    ln -s \"\$HOME/.docker/cli-plugins\" \"\$DOCKER_CONFIG/cli-plugins\"
  fi
  if docker compose version >/dev/null 2>&1; then compose() { docker compose \"\$@\"; }
  elif command -v docker-compose >/dev/null 2>&1; then compose() { docker-compose \"\$@\"; }
  else echo '✗ Docker Compose not found on the box' >&2; exit 1; fi
  set -a; . '$ENV_FILE'; set +a
  old_web=\$(docker images -q seeater-web:latest)
  old_api=\$(docker images -q seeater-api:latest)
  docker build -q -t seeater-web:latest \
    --build-arg VITE_ENABLE_SYNC=true \
    --build-arg VITE_API_BASE_URL=/api \
    --build-arg VITE_CLERK_PUBLISHABLE_KEY=\"\$CLERK_PUBLISHABLE_KEY\" . >/dev/null
  docker build -q -t seeater-api:latest -f apps/api/Dockerfile . >/dev/null
  docker rm -f seeater >/dev/null 2>&1 || true
  stack() { compose --env-file '$ENV_FILE' -f docker/compose.yml \"\$@\"; }
  ok=true
  stack up -d --no-build --remove-orphans --wait --wait-timeout 120 || ok=false
  for pair in \"\$old_web seeater-web\" \"\$old_api seeater-api\"; do
    set -- \$pair
    [ \$# -eq 2 ] || continue
    if [ \"\$1\" != \"\$(docker images -q \$2:latest)\" ]; then docker rmi \"\$1\" >/dev/null 2>&1 || true; fi
  done
  # --wait counts a container without a healthcheck as ready once it starts,
  # so give cloudflared a moment to show a crash loop (e.g. a bad token).
  sleep 5
  stack ps --format '{{.Service}}: {{.Status}}'
  [ \"\$(stack ps cloudflared --format '{{.State}}')\" = running ] || ok=false
  if [ \$ok = false ]; then
    echo '✗ the stack is not healthy; recent logs:' >&2
    stack logs --tail 5 api cloudflared >&2
    exit 1
  fi"

PUBLIC_HOST=$(ssh "$HOST" "sed -n 's/^PUBLIC_HOST=//p' '$ENV_FILE'")
echo "✓ https://$PUBLIC_HOST"
