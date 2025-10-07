# syntax=docker/dockerfile:1.5
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY apps ./apps
COPY libs ./libs
COPY .env ./.env

RUN --mount=type=secret,id=dotenv_key \
    DOTENV_PRIVATE_KEY=$(cat /run/secrets/dotenv_key) \
    npx dotenvx decrypt .env

COPY dist ./dist

EXPOSE 3003
CMD ["node", "dist/apps/driver/main.js"]
