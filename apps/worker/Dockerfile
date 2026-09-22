FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm --filter @haut/worker build
CMD ["pnpm","--filter","@haut/worker","start:prod"]
