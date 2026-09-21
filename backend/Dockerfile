# ---- Build stage: install production dependencies ----
FROM node:24-slim AS build
WORKDIR /app
# Install with dev deps so prisma (the CLI) is available for generate/migrate.
COPY package.json package-lock.json ./
COPY src/dataconnect-generated ./src/dataconnect-generated
RUN npm ci

# ---- Runtime stage ----
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Cloud Run injects PORT and this service listens on it.
ENV PORT=8080

# Only production deps, but prisma CLI is needed to run migrations at boot.
COPY package.json package-lock.json ./
COPY src/dataconnect-generated ./src/dataconnect-generated
RUN npm ci

# Prisma needs its schema + migrations inside the image to generate the client
# and to run `migrate deploy` on container start.
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

# Apply any pending migrations, then boot the API.
# Cloud Run calls this port when the container starts listening.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]