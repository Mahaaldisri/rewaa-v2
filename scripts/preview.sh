#!/usr/bin/env bash
# One-command preview server.
#
# `node_modules/` is not preserved between sandbox restarts, so the dev server
# cannot survive a recycle on its own. This script reinstalls the locked
# dependencies only when they are missing, then starts Vite on 0.0.0.0 so the
# platform proxy can reach it.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d node_modules ] || [ ! -x node_modules/.bin/vite ]; then
  echo "› installing locked dependencies…"
  npm ci --no-audit --no-fund
fi

echo "› starting Vite on 0.0.0.0:${PORT:-5173}"
exec ./node_modules/.bin/vite --host 0.0.0.0 --port "${PORT:-5173}" --strictPort
