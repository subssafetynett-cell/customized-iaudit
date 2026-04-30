# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl python3 make g++

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
COPY prisma.config.js ./
RUN DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy npx prisma generate

COPY . .

# Stage 2: Production Runtime
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.js ./
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/src ./src

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "src/index.js"]
