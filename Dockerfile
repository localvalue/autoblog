FROM node:24-alpine AS base
RUN npm install -g pnpm

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/db run build
RUN pnpm --filter @workspace/api-zod run build
RUN pnpm --filter @workspace/api-server run build

EXPOSE 3000
CMD ["node", "artifacts/api-server/dist/index.mjs"]
