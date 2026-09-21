// Firebase client initialisation for UPNEX.
//
// The config is read from Vite environment variables (frontend/.env) so the
// values are not hard-coded into a tracked file. Vite only exposes variables
// prefixed with VITE_, and it inlines them into the bundle at build time.
//
// These values are NOT secret. Firebase's apiKey only *identifies* the project;
// it does not authorise access. Real protection comes from Firestore Security
// Rules (see firestore.rules) and from verifying ID tokens on the server.
//
// To populate: copy frontend/.env.example to frontend/.env and paste the values
// from Firebase Console -> Project settings -> General -> Your apps -> Config.

import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Surface a clear, actionable error at startup instead of an opaque
// "auth/invalid-api-key" thrown from deep inside a sign-in call.
export function firebaseIsConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

// IMPORTANT: never initialise Firebase when the config is incomplete.
// initializeApp with an empty apiKey throws "Firebase: Error (auth/invalid-api-key)"
// at module load, which rejects the import chain and stops the whole app from
// mounting. Configured or not, this module must import cleanly.
export const app = firebaseIsConfigured()
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;

if (googleProvider) {
  // Always show the account chooser rather than silently reusing the last
  // Google session, matching the backend's existing prompt=select_account.
  googleProvider.setCustomParameters({ prompt: "select_account" });
}

export function firebaseMissingHint(method = "this") {
  return `Firebase is not configured so ${method} isn't available yet. ` +
    "Copy frontend/.env.example to frontend/.env and fill in VITE_FIREBASE_API_KEY, " +
    "VITE_FIREBASE_MESSAGING_SENDER_ID and VITE_FIREBASE_APP_ID from " +
    "Firebase Console -> Project settings -> Your apps.";
}

export default app;
