FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY apps/notification ./apps/notifications
COPY libs ./libs
COPY proto/notification.proto ./proto/notification.proto
COPY ./apps/notification/.env ./.env
COPY tsconfig*.json ./

RUN --mount=type=secret,id=dotenv_notification_key \
    DOTENV_PRIVATE_KEY=$(cat /run/secrets/dotenv_notification_key) \
    npx dotenvx decrypt .env

COPY dist/apps/notification ./dist/apps/notification

EXPOSE 3004
CMD ["node", "dist/apps/notification/main.js"]
