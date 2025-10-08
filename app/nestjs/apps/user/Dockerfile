# syntax=docker/dockerfile:1.5
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY apps/user ./apps/user
COPY libs ./libs
COPY .env ./.env
COPY tsconfig*.json ./

RUN --mount=type=secret,id=dotenv_key \
    DOTENV_PRIVATE_KEY=$(cat /run/secrets/dotenv_key) \
    npx dotenvx decrypt .env

COPY dist/apps/user ./dist/apps/user

EXPOSE 3001
CMD ["node", "dist/apps/user/main.js"]
