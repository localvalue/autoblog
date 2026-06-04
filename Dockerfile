FROM node:22-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/db run build
RUN pnpm --filter @workspace/api-zod run build
RUN pnpm --filter @workspace/api-server run build

EXPOSE 3000
CMD ["node", "artifacts/api-server/dist/index.mjs"]
