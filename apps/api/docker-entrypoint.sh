#!/bin/sh
# Container entrypoint (see Dockerfile): apply pending migrations, then run the
# API as PID 1 so it gets SIGTERM on `docker stop`. This is the same as the
# workspace's `npm run prisma:deploy && npm start`, minus npm (not in the image).
set -e
cd /app/apps/api
/app/node_modules/.bin/prisma migrate deploy
exec node dist/server.js
