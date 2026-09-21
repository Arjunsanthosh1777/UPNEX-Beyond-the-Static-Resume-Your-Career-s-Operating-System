import { prisma } from "./config/database.js";
import { verificationIdFor } from "./utils/files.js";

// Identifies the bots that read Open Graph tags so the server can hand them a
// metadata HTML shell instead of the JS bundle, which they don't execute.
const CRAWLERS = /(facebookexternalhit|LinkedInBot|Twitterbot|WhatsApp|TelegramBot|Pinterest|Googlebot|bingbot|Slackbot|Discordbot|redditbot|SkypeUriPreview|embedly|snapchat|VKShare|curl|wget|Go-http-client)/i;

export function isCrawler(ua) {
  return typeof ua === "string" && CRAWLERS.test(ua);
}

function snippet(value, max = 160) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function userMeta(username) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.profilePublic === false) return null;
  return {
    title: `${user.name || "Student"} on UPNEX`,
    description: snippet(user.headline || `${user.name || "This student"} builds a verified career record on UPNEX.`)
  };
}

async function verifyMeta(rawId) {
  const verificationId = String(rawId || "").trim().toUpperCase();
  if (!verificationId) return null;

  const stored = await prisma.vaultDocument.findFirst({
    where: { verificationId: { equals: verificationId, mode: "insensitive" }, verified: true },
    select: { fileName: true, issuer: true, documentType: true }
  });
  if (stored) {
    return {
      title: `Verified document — ${stored.fileName}`,
      description: snippet(`${stored.issuer ? `${stored.issuer} · ` : ""}${stored.documentType || "document"} verified on UPNEX.`)
    };
  }

  // Derived ID fallback mirrors the verify endpoint: scan recent verified docs.
  const documents = await prisma.vaultDocument.findMany({
    where: { verified: true },
    orderBy: { createdAt: "desc" },
    take: 250,
    select: { id: true, fileName: true, issuer: true, documentType: true }
  });
  const hit = documents.find((doc) => verificationIdFor(doc.id).toLowerCase() === verificationId.toLowerCase());
  if (!hit) return null;
  return {
    title: `Verified document — ${hit.fileName}`,
    description: snippet(`${hit.issuer ? `${hit.issuer} · ` : ""}${hit.documentType || "document"} verified on UPNEX.`)
  };
}

function renderOg(meta, req) {
  const base = `http://${req.headers.host}`;
  const imageUrl = `${base}/og/og-default.png`;
  const url = `${base}${req.originalUrl}`;
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="UPNEX" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
  </head>
  <body></body>
</html>`;
}

// Mounted after the /api routes. For GET requests that a crawler will make, it
// answers with branded Social/OG tags for a matching profile or verify ID.
export async function ogHandler(req, res, next) {
  if (req.method !== "GET" || req.path.startsWith("/api") || req.path.includes(".")) return next();
  if (!isCrawler(req.headers["user-agent"])) return next();

  const segments = req.path.split("/").filter(Boolean);
  let meta = null;
  try {
    if (segments[0] === "verify" && segments[1]) meta = await verifyMeta(segments[1]);
    else if (segments.length === 1) meta = await userMeta(segments[0]);
  } catch {
    meta = null;
  }
  if (!meta) return next();

  res.type("html").send(renderOg(meta, req));
}