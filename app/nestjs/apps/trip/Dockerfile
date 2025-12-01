# syntax=docker/dockerfile:1.5
FROM node:22-alpine

RUN apk add --no-cache python3 make g++ bash

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY apps/trip ./apps/trip
COPY libs ./libs
COPY proto/trip.proto ./proto/trip.proto
COPY ./apps/trip/.env ./.env
COPY tsconfig*.json ./

RUN --mount=type=secret,id=dotenv_trip_key \
    DOTENV_PRIVATE_KEY=$(cat /run/secrets/dotenv_trip_key) \
    npx dotenvx decrypt .env

COPY dist/apps/trip ./dist/apps/trip

EXPOSE 3002
CMD ["node", "dist/apps/trip/main.js"]
