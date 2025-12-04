# syntax=docker/dockerfile:1.5
FROM node:22-alpine

RUN apk add --no-cache python3 make g++ bash

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY apps/driver ./apps/driver
COPY libs ./libs
COPY proto/driver.proto ./proto/driver.proto
COPY proto/trip.proto ./proto/trip.proto
COPY ./apps/driver/.env ./.env
COPY tsconfig*.json ./

RUN --mount=type=secret,id=dotenv_driver_key \
    DOTENV_PRIVATE_KEY=$(cat /run/secrets/dotenv_driver_key) \
    npx dotenvx decrypt .env

COPY dist/apps/driver ./dist/apps/driver

EXPOSE 3003
CMD ["node", "dist/apps/driver/main.js"]
