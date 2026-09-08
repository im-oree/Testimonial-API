# ============================================================
# Testimonial API — api service image
# Multi-stage: build domain + shared-types (workspace) then api.
# Deployed to Cloud Run (README §3). Worker has its own image.
# ============================================================
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --workspace @testimonial-api/api --include-workspace-root || npm install --workspace @testimonial-api/api --include-workspace-root

FROM deps AS build
WORKDIR /repo
COPY . .
RUN npx prisma generate --schema apps/api/src/infrastructure/database/postgres/schema.prisma \
  && npx turbo run build --filter=@testimonial-api/api

FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/packages/domain/dist ./packages/domain/dist
COPY --from=build /repo/packages/shared-types/dist ./packages/shared-types/dist
# Prisma query engine ships with @prisma/client in node_modules; keep schema for engine resolution
COPY --from=build /repo/apps/api/src/infrastructure/database/postgres/schema.prisma ./apps/api/src/infrastructure/database/postgres/schema.prisma
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
