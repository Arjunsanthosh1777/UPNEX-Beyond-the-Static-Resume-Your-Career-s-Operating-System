// Firebase token verification for UPNEX.
//
// This module verifies Firebase ID tokens (JWTs) issued by the project. Two
// strategies are supported, tried in order:
//
//   1. Admin SDK (Firebase service account) — preferred when available.
//      Supports token-revocation checking.
//   2. Public-key fallback — validates RS256 signatures against Google's
//      published certificate set. No service-account key required.
//
// When neither is present the route reports "not configured", rather than
// crashing the API on boot.

import jwt from "jsonwebtoken";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "upnex-b702a";
const CERT_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

// -------------------------------------------------------------------
// Admin SDK (only used when a service account is configured)
// -------------------------------------------------------------------
let cachedApp = null;
let initialised = false;

function parseServiceAccount(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    return parsed;
  } catch (error) {
    console.error("[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:", error.message);
    return null;
  }
}

function initAdmin() {
  if (initialised) return cachedApp;
  initialised = true;

  const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const hasFileCredentials = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (!serviceAccount && !hasFileCredentials) return null;

  try {
    cachedApp = getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: serviceAccount ? cert(serviceAccount) : undefined,
          projectId: PROJECT_ID
        });
  } catch (error) {
    console.error("[firebase-admin] Failed to initialise:", error.message);
    return null;
  }
  return cachedApp;
}

export function firebaseAdminIsConfigured() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

function adminAuthInstance() {
  const app = initAdmin();
  return app ? getAuth(app) : null;
}

// -------------------------------------------------------------------
// Public-key certificate cache (used when Admin SDK is unavailable)
// -------------------------------------------------------------------
let certCache = { certs: null, fetchedAt: 0 };
const CERT_TTL = 30 * 60 * 1000; // 30 minutes

async function fetchPublicCerts() {
  if (certCache.certs && Date.now() - certCache.fetchedAt < CERT_TTL) {
    return certCache.certs;
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12000);
  try {
    const res = await fetch(CERT_URL, { signal: ac.signal });
    if (!res.ok) throw new Error(`certificate fetch failed: HTTP ${res.status}`);
    const certs = await res.json();
    certCache = { certs, fetchedAt: Date.now() };
    return certs;
  } catch (error) {
    // Return stale cache when offline rather than failing immediately.
    if (certCache.certs) return certCache.certs;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// -------------------------------------------------------------------
// Unified verification
// -------------------------------------------------------------------
export async function verifyFirebaseIdToken(idToken) {
  // Prefer Admin SDK when available (supports token-revocation checks).
  const admin = adminAuthInstance();
  if (admin) {
    return await admin.verifyIdToken(idToken, true);
  }

  // Fallback: validate signature with the project's published x509 certs.
  // This is the same verification the Admin SDK performs internally — we
  // simply call jsonwebtoken directly to avoid the requirement of a
  // service-account key for projects that haven't uploaded one yet.
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded.header !== "object") {
    throw new Error("Malformed Firebase ID token.");
  }

  const certs = await fetchPublicCerts();
  const publicKey = certs[decoded.header.kid];
  if (!publicKey) {
    throw new Error(`Unknown signing key ${decoded.header.kid} — token may have been issued with stale keys; retry shortly.`);
  }

  return jwt.verify(idToken, publicKey, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID
  });
}
