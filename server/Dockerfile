# Official images via AWS Public ECR (Docker Hub often TLS-times out on some networks).
FROM public.ecr.aws/docker/library/node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl python3 make g++

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
COPY prisma.config.js ./
RUN DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy npx prisma generate

COPY . .

FROM public.ecr.aws/docker/library/node:22-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.js ./
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
ENV RUNNING_IN_DOCKER=1
EXPOSE 3001

CMD ["./docker-entrypoint.sh"]
