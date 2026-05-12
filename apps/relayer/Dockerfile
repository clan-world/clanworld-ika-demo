FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/relayer ./apps/relayer
RUN pnpm install --filter @clanworld/relayer... --prod=false

FROM deps AS build
RUN pnpm --filter @clanworld/relayer build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/relayer ./apps/relayer
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
EXPOSE 8787
CMD ["pnpm", "--filter", "@clanworld/relayer", "start"]
