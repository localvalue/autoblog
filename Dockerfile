FROM node:22-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config files first
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

# Install dependencies - allow build scripts for native modules
RUN pnpm install --frozen-lockfile --config.unsafe-perm=true

# Build the packages in order
RUN pnpm --filter @workspace/db run build
RUN pnpm --filter @workspace/api-zod run build
RUN pnpm --filter @workspace/api-server run build

EXPOSE 3000
CMD ["node", "artifacts/api-server/dist/index.mjs"]
