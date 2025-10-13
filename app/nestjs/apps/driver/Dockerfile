# syntax=docker/dockerfile:1.5
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY apps/driver ./apps/driver
COPY libs ./libs
COPY ./apps/driver/.env ./.env
COPY tsconfig*.json ./

RUN --mount=type=secret,id=dotenv_driver_key \
    DOTENV_PRIVATE_KEY=$(cat /run/secrets/dotenv_driver_key) \
    npx dotenvx decrypt .env

COPY dist/apps/driver ./dist/apps/driver

EXPOSE 3003
CMD ["node", "dist/apps/driver/main.js"]
