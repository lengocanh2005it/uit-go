# syntax=docker/dockerfile:1.5
FROM node:22-alpine

RUN apk add --no-cache python3 make g++ bash

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY apps/user ./apps/user
COPY libs ./libs
COPY proto/user.proto ./proto/user.proto
COPY proto/driver.proto ./proto/driver.proto
COPY proto/trip.proto ./proto/trip.proto
COPY ./apps/user/.env ./.env
COPY tsconfig*.json ./

RUN --mount=type=secret,id=dotenv_user_key \
    DOTENV_PRIVATE_KEY=$(cat /run/secrets/dotenv_user_key) \
    npx dotenvx decrypt .env

COPY dist/apps/user ./dist/apps/user

EXPOSE 3001
CMD ["node", "dist/apps/user/main.js"]
