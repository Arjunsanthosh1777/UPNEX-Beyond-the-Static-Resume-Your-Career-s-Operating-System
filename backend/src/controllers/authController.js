import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { verifyFirebaseIdToken } from "../config/firebaseAdmin.js";
import { signToken } from "../utils/jwt.js";
import { assignUsername, nextAvailableUsername, usernameBase } from "../utils/username.js";
import { sendLoginAlert, sendWelcome } from "../services/alerts.js";

const authSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(100)
});

// Cross-origin deployment (hosted SPA + API on another origin) requires
// SameSite=None + Secure cookies. Local same-origin dev works with the lax
// default, so both modes are configurable instead of hard-coded.
const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.COOKIE_SAMESITE || "lax",
  secure: process.env.COOKIE_SECURE === "true" ? true : process.env.COOKIE_SECURE === "false" ? false : process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000
};

function googleClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Placeholder values (e.g. "your-google-client-id.apps.googleusercontent.com")
// must not be treated as configured — they break the OAuth redirect flow.
const PLACEHOLDER_MARKERS = ["your-", "change-me", "changeme", "example", "xxx"];
function looksLikePlaceholder(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "" || PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

function googleIsConfigured() {
  return [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI].every(
    (value) => !looksLikePlaceholder(value)
  );
}

export async function register(req, res) {
  const data = authSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });

  if (exists) return res.status(409).json({ message: "Email already registered." });

  const passwordHash = await bcrypt.hash(data.password, 12);
  const username = await nextAvailableUsername(prisma, usernameBase(data.name, data.email));
  const user = await prisma.user.create({
    data: {
      name: data.name || "UPNEX Learner",
      email: data.email,
      passwordHash,
      username
    },
    select: { id: true, name: true, email: true, username: true, role: true, emailPrefs: true }
  });

  res.cookie("upnex_token", signToken(user), cookieOptions);
  sendWelcome({ user }).catch(() => {});
  sendLoginAlert({ user, req, via: "Email" }).catch(() => {});
  res.status(201).json({ user });
}

export async function login(req, res) {
  const data = authSchema.omit({ name: true }).parse(req.body);
  let user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  // Users created before usernames existed get one backfilled on first login.
  if (!user.username) {
    await assignUsername(prisma, user.id, user.name, user.email);
    user = await prisma.user.findUnique({ where: { id: user.id } });
  }

  const safeUser = { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role };
  res.cookie("upnex_token", signToken(safeUser), cookieOptions);
  sendLoginAlert({ user, req, via: "Email" }).catch(() => {});
  res.json({ user: safeUser });
}

export function googleLogin(req, res) {
  if (!googleIsConfigured()) {
    return res.status(503).json({ message: "Google sign-in is not configured yet." });
  }

  const client = googleClient();
  const authorizationUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "select_account"
  });
  res.redirect(authorizationUrl);
}

export async function googleCallback(req, res) {
  const clientUrl = process.env.CLIENT_URL || (process.env.NODE_ENV === "production" ? process.env.RENDER_EXTERNAL_URL : undefined) || "http://localhost:5173";
  if (!googleIsConfigured()) return res.redirect(`${clientUrl}/login?error=google_not_configured`);
  if (!req.query.code) return res.redirect(`${clientUrl}/login?error=google_cancelled`);

  try {
    const client = googleClient();
    const { tokens } = await client.getToken(req.query.code);
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) throw new Error("Google account email is not verified.");

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: { name: payload.name || undefined, avatar: payload.picture || undefined },
      create: {
        name: payload.name || "UPNEX Learner",
        email: payload.email,
        avatar: payload.picture || undefined,
        passwordHash: await bcrypt.hash(randomUUID(), 12)
      },
      select: { id: true, name: true, email: true, role: true, avatar: true, emailPrefs: true }
    });

    res.cookie("upnex_token", signToken(user), cookieOptions);
    sendLoginAlert({ user, req, via: "Google" }).catch(() => {});
    res.redirect(`${clientUrl}/dashboard`);
  } catch (error) {
    console.error("Google authentication failed:", error.message);
    res.redirect(`${clientUrl}/login?error=google_failed`);
  }
}

// Exchanges a Firebase ID token (from the client SDK) for the app's own session
// cookie. The user record is upserted into Prisma, so a Firebase sign-in creates
// the same User row the rest of the API already reads by req.auth.id.
const firebaseTokenSchema = z.object({ idToken: z.string().min(10) });

export async function firebaseLogin(req, res) {
  const { idToken } = firebaseTokenSchema.parse(req.body);

  let decoded;
  try {
    // verifyFirebaseIdToken checks the signature, expiry, issuer and audience
    // against the project's keys. With a service account configured it also
    // rejects tokens from disabled / revoked sessions.
    decoded = await verifyFirebaseIdToken(idToken);
  } catch (error) {
    console.error("Firebase token verification failed:", error.message);
    return res.status(401).json({ message: "Invalid or expired Firebase token." });
  }

  if (!decoded.email) {
    return res.status(400).json({ message: "Your Firebase account has no email address." });
  }

  const user = await prisma.user.upsert({
    where: { email: decoded.email },
    update: {
      name: decoded.name || undefined,
      avatar: decoded.picture || undefined
    },
    create: {
      name: decoded.name || "UPNEX Learner",
      username: await nextAvailableUsername(prisma, usernameBase(decoded.name, decoded.email)),
      email: decoded.email,
      avatar: decoded.picture || undefined,
      // Firebase accounts may never set a password. Store an unusable random
      // hash so the column stays non-null and password login stays impossible
      // for this account unless a password reset is done deliberately.
      passwordHash: await bcrypt.hash(randomUUID(), 12)
    },
    select: { id: true, name: true, email: true, username: true, role: true, avatar: true, emailPrefs: true }
  });

  res.cookie("upnex_token", signToken(user), cookieOptions);
  sendLoginAlert({ user, req, via: "Google" }).catch(() => {});
  res.json({ user });
}

export function logout(req, res) {
  res.clearCookie("upnex_token", cookieOptions);
  res.json({ message: "Logged out." });
}

export async function me(req, res) {
  let user = await prisma.user.findUnique({
    where: { id: req.auth.id },
    select: { id: true, name: true, email: true, username: true, role: true, avatar: true, preferredLanguage: true, clashPoints: true, clashWins: true, clashGames: true }
  });

  if (!user) return res.status(404).json({ message: "User not found." });

  // Backfill the public username for accounts created before the field existed.
  if (!user.username) {
    await assignUsername(prisma, user.id, user.name, user.email);
    user = await prisma.user.findUnique({
      where: { id: req.auth.id },
      select: { id: true, name: true, email: true, username: true, role: true, avatar: true, preferredLanguage: true, clashPoints: true, clashWins: true, clashGames: true }
    });
  }
  res.json({ user });
}