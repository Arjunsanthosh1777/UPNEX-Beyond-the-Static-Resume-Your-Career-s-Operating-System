# Firebase Integration (project `upnex-b702a`)

> **STATUS: NOT YET OPERATIONAL.** Everything below is written source code and
> configuration. Nothing has been installed, run, or deployed, because Node and
> the Firebase CLI are absent from this machine and the web config has not been
> supplied. Follow "Remaining manual steps" before expecting any of it to work.

UPNEX is wired for Firebase in two stages. **Stage (a)** (Firebase Auth) is
complete as *code*. **Stage (b)** provides the Firestore data layer and is
deliberately not switched on, so the app keeps running on Prisma/SQLite until you
migrate controllers one at a time.

## What changed

### Stage (a) — Firebase Auth (code written, not run)

| File | Change |
| ---- | ------ |
| `frontend/src/services/firebase.js` | **New.** Initialises the Firebase app, Auth, Firestore, and the Google provider from Vite env vars. |
| `frontend/.env.example` | **New.** Template for the web config values. |
| `frontend/src/context/AuthContext.jsx` | Email/password and Google sign-in now go through Firebase. Existing `login` / `register` / `logout` / `continueAsGuest` signatures are unchanged, so pages did not need rewriting. |
| `frontend/src/pages/Auth/AuthPage.jsx` | Google button now opens a popup instead of a full-page redirect; auth errors are mapped to readable copy. |
| `backend/src/config/firebaseAdmin.js` | **New.** Initialises the Admin SDK and verifies ID tokens. |
| `backend/src/controllers/authController.js` | **New** `firebaseLogin` handler: verifies the ID token, upserts the Prisma `User`, issues the normal session cookie. |
| `backend/src/routes/authRoutes.js` | **New** `POST /api/auth/firebase`. |
| `backend/src/config/validateEnv.js` | Warns at boot if Firebase Admin credentials are missing. |

**How sign-in flows now:**

```
Browser                Express API                 Firebase
  |  Firebase sign-in  ------------------------------------>  |
  | <-----------------------------  ID token               |
  |  POST /api/auth/firebase {idToken}                       |
  |-------------------->  verifyIdToken()  -----------------> |
  |                       upsert Prisma User                  |
  | <----------------  upnex_token cookie                    |
```

The API keeps issuing its own `upnex_token` cookie, so **every existing
protected route and `requireAuth` middleware is untouched**. This is why the
migration is reversible and why it did not require rewriting controllers.

Google sign-in via the old OAuth redirect (`/api/auth/google`) still exists and
still works if you configure `GOOGLE_CLIENT_ID`; the Firebase popup simply
replaces it as the recommended path and needs no redirect URI.

### Stage (b) — Firestore data layer (written, not enabled)

`backend/src/config/firestore.js` provides a Firestore repository that mirrors
the Prisma models (`users`, `courses`, `vaultDocuments`, `academicMarks`,
`projects`, …). It returns ISO date strings so responses match the Prisma shape
exactly and the frontend cannot tell which backend served a request.

**Controllers still import Prisma.** Nothing calls the Firestore module yet. To
migrate a feature, swap the import in one controller, e.g.:

```js
// before
import { prisma } from "../config/database.js";
const documents = await prisma.vaultDocument.findMany({ where: { userId } });

// after
import { listVaultDocuments } from "../config/firestore.js";
const documents = await listVaultDocuments(userId);
```

### Firestore rules and hosting config

- `firestore.rules` — replaced the starter rule that granted the **entire
  internet read/write/delete on every document until Oct 2026**. Now default-deny:
  users touch only `users/{uid}`, courses are public-read/admin-write.
- `firebase.json` / `.firebaserc` — created, pointing Hosting at `frontend/dist`
  and linking project `upnex-b702a`.

---

## Remaining manual steps

These require your accounts and secrets, so they cannot be done for you.

### 1. Install the toolchain

Neither Node nor the Firebase CLI is installed on this machine — verified with
`Get-Command node,npm,firebase`, which returns nothing.

1. Install Node.js LTS from <https://nodejs.org/> (accept "Add to PATH").
2. **Reopen your terminal** so PATH refreshes.
3. Install the CLI: `npm i -g firebase-tools` then `firebase login`
   ([CLI docs](https://firebase.google.com/docs/cli)).

### 2. Add your web config

Firebase Console → ⚙️ Project settings → General → **Your apps** → **SDK setup
and configuration** → **Config**. Copy the values into `frontend/.env`
(created from `frontend/.env.example`):

```env
VITE_FIREBASE_API_KEY="AIza..."
VITE_FIREBASE_AUTH_DOMAIN="upnex-b702a.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="upnex-b702a"
VITE_FIREBASE_STORAGE_BUCKET="upnex-b702a.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
VITE_FIREBASE_APP_ID="1:1234567890:web:abc123"
```

These are **not secrets** — the `apiKey` only identifies the project, it does not
authorise access ([explanation](https://stackoverflow.com/questions/37482366)).

### 3. Enable sign-in methods

Firebase Console → **Authentication** → Sign-in method → enable **Email/Password**
and **Google**.

### 4. Give the backend Admin credentials

Firebase Console → Project settings → **Service accounts** → **Generate new
private key**. Then either:

- **Local dev:** save the JSON **outside the repo** and set
  `GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\key.json"` in `backend/.env`, or
- **Deployed:** put the JSON on one line in `FIREBASE_SERVICE_ACCOUNT_JSON`.

`.gitignore` now blocks `*firebase-adminsdk*.json` and `*service-account*.json`
so a key cannot be committed by accident. **Never commit this file.**

### 5. Install new dependencies and run

```powershell
npm install --prefix frontend   # picks up the added firebase dependency
npm install --prefix backend    # picks up firebase-admin
npm run dev
```

### 6. Deploy

```powershell
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only hosting
```

Hold off on `functions` — `functions/lib` does not exist yet (the TypeScript has
never been compiled) and `functions/src/genkit-sample.ts` needs a
`GOOGLE_GENAI_API_KEY` secret plus a billing-enabled project.

---

## What is verified vs. not

**Verified on disk:** all files above exist with the contents described;
`firestore.rules` no longer contains the open-access rule; the frontend and
backend package files list the new dependencies; the route and handler are wired
consistently.

**Not verified:** nothing has been run. `npm install` and the dev server could
not be executed because Node is absent, so the code has **not** been exercised
against a real Firebase project. Expect to fix small issues on first run — that
is normal for an integration that has never been executed.
