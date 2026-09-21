import { createHmac, timingSafeEqual } from "node:crypto";

// Capability-style access tokens for vault files. The token itself carries
// { documentId, userId, action, expiry } and is HMAC-signed with JWT_SECRET,
// so no cookie/session is needed on the media request. The storage handler
// re-verifies ownership against the DB before streaming, so tokens remain
// valid only for as long as the document exists and belongs to that user.

function secret() {
  return process.env.JWT_SECRET || "dev-only-insecure-secret";
}

function b64url(raw) {
  return Buffer.from(raw).toString("base64url");
}

function sign(payloadPart) {
  return createHmac("sha256", secret()).update(payloadPart).digest("base64url");
}

export function signAccessToken({ documentId, userId, action, expiresInSec }) {
  const payload = JSON.stringify({
    v: 1,
    d: documentId,
    u: userId,
    a: action,
    e: Math.floor(Date.now() / 1000) + expiresInSec
  });
  const payloadPart = b64url(payload);
  return `${payloadPart}.${sign(payloadPart)}`;
}

export function verifyAccessToken(token, { now = Date.now() } = {}) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const dot = token.lastIndexOf(".");
  const payloadPart = token.slice(0, dot);
  const sig = Buffer.from(token.slice(dot + 1), "utf8");
  const expected = Buffer.from(sign(payloadPart), "utf8");
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (payload?.v !== 1 || typeof payload.d !== "string" || typeof payload.u !== "string") return null;
  if (payload.a !== "preview" && payload.a !== "download") return null;
  if (payload.e < Math.floor(now / 1000)) return null;
  return payload;
}