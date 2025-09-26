FROM node:20-alpine AS base

WORKDIR /app

COPY server/package*.json ./

RUN npm install --omit=dev

COPY server/. .

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

CMD ["node", "src/server.js"]

