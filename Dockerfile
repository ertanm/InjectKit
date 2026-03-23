FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY server/package.json server/package-lock.json ./server/
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN cd server && npm ci --omit=dev

FROM base AS build
COPY server/package.json server/package-lock.json ./server/
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN cd server && npm ci
COPY server/ ./server/
RUN cd server && npx prisma generate
RUN cd server && npx tsc --outDir ./dist

FROM base AS runner
ENV NODE_ENV=production
COPY docs/ /app/docs/
COPY --from=deps /app/server/node_modules ./node_modules
COPY --from=deps /app/server/package.json ./server/package.json
COPY server/ ./server/
COPY --from=build /app/server/generated ./server/generated
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh
EXPOSE 3000
WORKDIR /app/server
CMD ["/app/scripts/start.sh"]
