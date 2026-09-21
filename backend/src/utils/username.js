// Username handling for public profile URLs (/username).
//
// Public usernames are lowercase `[a-z0-9-_]`, 3-24 chars. A reserved list
// keeps static app routes (and common system words) out of user hands, so
// /:username can never shadow /login, /dashboard, /api, etc.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
const USERNAME_PATTERN = /^[a-z0-9_][a-z0-9_-]*$/;

// Reserved at the app level: static routes + fixtures that must never resolve
// to a user profile.
export const RESERVED_USERNAMES = new Set([
  "login", "register", "signin", "signup", "auth", "logout",
  "dashboard", "settings", "search", "explore", "notifications",
  "profile", "u", "user", "users", "account", "accounts",
  "api", "api-docs", "health", "status", "admin", "mod", "moderator",
  "about", "terms", "privacy", "legal", "help", "support", "contact",
  "home", "feed", "for-you", "following", "followers",
  "me", "my", "new", "edit", "create", "delete", "upload",
  "favicon", "favicon.ico", "robots.txt", "sitemap.xml", "manifest.json",
  "assets", "static", "images", "css", "js", "public", "src", "dist",
  "login.jsx", ".env", "attributions", "opensource", "branding"
]);

/** Normalises user input into the canonical public form (or null if unusable). */
export function normalizeUsername(input) {
  if (typeof input !== "string") return null;
  const candidate = input.trim().toLowerCase();
  if (candidate.length < USERNAME_MIN || candidate.length > USERNAME_MAX) return null;
  if (!USERNAME_PATTERN.test(candidate)) return null;
  return candidate;
}

/** Whether a raw route param looks like a *valid non-reserved* username. */
export function isValidUsername(input) {
  const normalized = normalizeUsername(input);
  if (!normalized) return false;
  return !RESERVED_USERNAMES.has(normalized);
}

/**
 * Derives a base username from a display name or email address.
 * "Riya Sharma" -> "riya-sharma", "riya.sharma@college.edu" -> "riya-sharma"
 */
export function usernameBase(name, email) {
  const source = (name || "").trim() ? name : String(email || "").split("@")[0];
  const slug = String(source)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, USERNAME_MAX);
  if (slug.length < USERNAME_MIN) return null;
  return slug;
}

/**
 * Returns the first available username for `base` by appending a numeric
 * suffix on collision ("riya-sharma", "riya-sharma1", ...). Reserved words are
 * also treated as taken.
 */
export async function nextAvailableUsername(prisma, base, reserved = RESERVED_USERNAMES) {
  if (!base) return null;
  if (reserved.has(base)) {
    return nextAvailableUsername(prisma, `${base}1`, reserved); // "admin" -> "admin1"
  }
  const taken = await prisma.user.findUnique({ where: { username: base }, select: { id: true } });
  if (!taken) return base;

  let i = 1;
  for (; i < 1000; i += 1) {
    const candidate = `${base}${i}`;
    if (reserved.has(candidate)) continue;
    const exists = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Assigns (and persists) a username for a user that doesn't have one yet. */
export async function assignUsername(prisma, userId, name, email) {
  const base = usernameBase(name, email);
  if (!base) return null;
  const username = await nextAvailableUsername(prisma, base);
  if (!username) return null;
  return prisma.user.update({
    where: { id: userId },
    data: { username },
    select: { username: true }
  });
}