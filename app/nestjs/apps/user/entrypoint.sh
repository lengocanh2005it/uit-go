#!/usr/bin/env bash
set -e

DOTENV_PRIVATE_KEY=$(cat /run/secrets/dotenv_user_key | tr -d '\r\n')
DOTENV_PRIVATE_KEY="$DOTENV_PRIVATE_KEY" npx dotenvx decrypt /apps/user/.env > /apps/user/.env.decrypted

tr -d '\r' < /apps/user/.env.decrypted > /apps/user/.env.clean

set -o allexport
export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' /apps/user/.env.clean | xargs)
set +o allexport

echo "✅ Decrypted and exported environment variables."

exec gosu postgres docker-entrypoint.sh postgres
