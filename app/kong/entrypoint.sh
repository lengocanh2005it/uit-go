#!/bin/sh
set -e

echo "Bootstrapping Kong database..."
kong migrations bootstrap || true

echo "Starting Kong in background..."
kong start --vv &
KONG_PID=$!

echo "Waiting for Kong Admin API..."
until curl -s http://localhost:8001/ >/dev/null 2>&1; do
  echo "Waiting..."
  sleep 2
done

echo "Admin API is ready. Syncing kong.yml..."
deck sync --state /tmp/kong.yml --kong-addr http://localhost:8001

echo "Kong is ready. Container will stay alive..."
tail -f /dev/null
