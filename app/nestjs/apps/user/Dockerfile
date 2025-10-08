# syntax=docker/dockerfile:1.5
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY apps ./apps
COPY libs ./libs
COPY .env ./.env
COPY tsconfig*.json ./

RUN --mount=type=secret,id=dotenv_key \
    DOTENV_PRIVATE_KEY=$(cat /run/secrets/dotenv_key) \
    npx dotenvx decrypt .env

RUN npm run build
COPY dist ./dist

EXPOSE 3001
CMD ["node", "dist/apps/user/main.js"]
