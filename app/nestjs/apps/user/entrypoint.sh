#!/bin/sh
set -e

cat /apps/user/.env

DOTENV_PRIVATE_KEY=$(cat /run/secrets/dotenv_user_key | tr -d '\r\n')

DOTENV_PRIVATE_KEY="$DOTENV_PRIVATE_KEY" npx dotenvx decrypt /apps/user/.env

echo "✅ Decrypted successfully. Contents:"
cat /apps/user/.env

set -o allexport
. /apps/user/.env
set +o allexport

exec docker-entrypoint.sh postgres
