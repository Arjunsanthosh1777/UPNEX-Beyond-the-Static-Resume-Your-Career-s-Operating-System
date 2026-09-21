# Multi-stage build for the whole UPNEX app: the React SPA is built in stage 1
# and the Express API in stage 2 serves both the API and that static bundle, so
# a single container runs the entire product. Deployed via the root render.yaml
# (Render Web Service, Docker runtime); the API binds to the $PORT Render gives
# it (10000 by default).

# ---- Stage 1: build the frontend bundle ----
FROM node:24-slim AS frontend
WORKDIR /app/frontend

# Firebase web config is public by design (it only identifies the project, it
# does not authorise access), so it is baked into the bundle at build time
# instead of requiring build secrets. Vite gives already-set VITE_* env vars
# the highest priority over .env files.
ENV VITE_FIREBASE_API_KEY=AIzaSyD0HkB6_0ZTgCz65yedUdVLAakXG3XBPBM
ENV VITE_FIREBASE_AUTH_DOMAIN=upnex-b702a.firebaseapp.com
ENV VITE_FIREBASE_PROJECT_ID=upnex-b702a
ENV VITE_FIREBASE_STORAGE_BUCKET=upnex-b702a.firebasestorage.app
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=441490466434
ENV VITE_FIREBASE_APP_ID=1:441490466434:web:e723e2bb56e8e2380d769b

# frontend has a file: dependency on @dataconnect/generated, so its folder must
# be present before npm ci resolves the tree.
COPY frontend/package.json frontend/package-lock.json ./
COPY frontend/src/dataconnect-generated ./src/dataconnect-generated
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: the backend API + SPA host ----
FROM node:24-slim AS backend
WORKDIR /app/backend

# Prisma needs OpenSSL/LibreSSL at build+runtime on Debian slim
RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
COPY backend/src/dataconnect-generated ./src/dataconnect-generated
COPY backend/prisma ./prisma
RUN npm ci && npx prisma generate

COPY backend/src ./src
COPY backend/public ./public

# app.js resolves the SPA from backendDir/../../frontend/dist — /app/frontend/dist
# in this layout — so the built bundle lands exactly where the fallback expects.
COPY --from=frontend /app/frontend/dist ./../frontend/dist

ENV NODE_ENV=production
ENV PORT=10000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]