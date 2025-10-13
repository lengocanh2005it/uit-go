#!/bin/sh
set -e

DOTENV_PRIVATE_KEY=$(cat /run/secrets/dotenv_trip_key | tr -d '\r\n')

npx dotenvx decrypt /apps/trip/.env > /.env

export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' /.env | xargs)

exec docker-entrypoint.sh mysqld
