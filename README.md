# UPNEX — Beyond the Static Resume: Your Career's Operating System

UPNEX is an AI-powered Student Intelligence and Digital Identity Platform. It replaces static resumes with dynamic, verifiable proof of academic and technical growth — combining GitHub-style proof-of-work tracking, AI-driven career pathing, and a secure credential vault for students.

Stop listing your skills — start proving them.

## Key Features

- **Verifiable Proof-of-Work** — track academic projects, skill milestones and repository contributions with transparent, verifiable progress.
- **Digital Student Twin** — AI-driven analytics that model career trajectories, identify skill gaps, and surface actionable next steps.
- **Student Network & Portfolio** — a modern digital presence for portfolios, peer collaboration and technical showcasing.
- **Secure Credential Vault** — a centralized workspace to store, manage and share academic records and certificates. Uploaded documents start as *pending review* and are marked *verified* only after actual verification.

## Stack

| Layer   | Tech                                      |
| ------- | ----------------------------------------- |
| Frontend| React 19, Vite, React Router, axios       |
| Backend | Express 5, Prisma (SQLite by default), zod|
| Auth    | Email + password (bcrypt), optional Google OAuth, guest mode |

## Current Flow

`/` Landing page → **Sign In / Start for Free** → `/dashboard` workspace
→ `/profile/vault | analysis | careers | portfolio`

Authentication is required for the workspace. The backend uses Prisma; the default database is a local SQLite file (`backend/prisma/dev.db`) so no external database server is needed to run locally.

## Run on Windows

Requirements: Node.js 20+.

```powershell
# 1. Backend env file (only needed for seeds/DB changes; the app reads it on boot)
Copy-Item backend\.env.example backend\.env

# 2. Prepare the database (first clone only)
npm install --prefix backend
npm run db:push --prefix backend
npm run seed --prefix backend

# 3. Start everything (installs deps, then API on :5000 + web on :5173)
npm run dev
```

Open the URL Vite prints, normally `http://localhost:5173`. Scripts and message by one command:

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Installs all dependencies, starts API (`:5000`) and web (`:5173`) together |
| `npm run dev:backend` | Backend only (nodemon) |
| `npm run dev:frontend` | Frontend only (Vite) |
| `npm run build` | Production build of the frontend |
| `npm run seed --prefix backend` | Loads sample courses |
| `npm test --prefix backend` | Runs the backend test suite |

Or, on Windows, run `start-upnex.ps1` from PowerShell which does the same as `npm run dev`.

## Configuration

Copy `backend/.env.example` to `backend/.env` and adjust if needed:

- `DATABASE_URL` — the `schema.prisma` uses the **sqlite** provider, so keep this as `file:./dev.db` (a `postgres://` value will crash SQLite).
- `JWT_SECRET` — generate a long random value (see the example file).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional. Leave blank to keep "Continue with Google" disabled; the app reports this gracefully.
- `CLIENT_URL` — the frontend origin used for OAuth redirects and CORS.