#!/bin/sh
set -e

DOTENV_PRIVATE_KEY=$(tr -d '\r\n' </run/secrets/dotenv_user_key)

exec env DOTENV_PRIVATE_KEY="$DOTENV_PRIVATE_KEY" \
  npx dotenvx run -- docker-entrypoint.sh postgres
