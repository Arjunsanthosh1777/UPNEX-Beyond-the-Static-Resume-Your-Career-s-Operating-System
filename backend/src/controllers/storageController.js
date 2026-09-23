import path from "node:path";
import { prisma } from "../config/database.js";
import { verifyAccessToken } from "../utils/signedUrl.js";
import { verifyToken } from "../utils/jwt.js";
import { friendlyDownloadName } from "../utils/files.js";
import { mediaStorageRoot, openFile } from "../services/objectStore.js";
import { isPublic } from "./publicController.js";

function contentDisposition(action, filename) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  return `${action === "download" ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

// The only public media endpoint. There is no static /uploads route: files are
// reachable exclusively through a short-lived HMAC-signed token, and access is
// re-validated against the database on every request (deleted documents and
// documents that no longer belong to the token's user stop working instantly).
export async function streamFile(req, res) {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({ message: "This link is invalid or has expired." });
  }

  const document = await prisma.vaultDocument.findFirst({
    where: { id: payload.d, userId: payload.u }
  });
  if (!document || !document.storageKey) {
    return res.status(404).json({ message: "This document is no longer available." });
  }

  const source = await openFile({ key: document.storageKey, range: req.headers.range });
  if (!source) {
    return res.status(404).json({ message: "The document file is missing." });
  }
  if (source.invalidRange) {
    return res.status(416).json({ message: "Requested byte range is invalid." });
  }

  const filename = friendlyDownloadName(document.originalName || document.fileName);
  const isDownload = payload.a === "download";

  res.set({
    "Content-Type": document.mime || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store, private",
    "Content-Disposition": contentDisposition(payload.a, filename),
    "X-Content-Type-Options": "nosniff"
  });

  try {
    await prisma.vaultDocument.update({
      where: { id: document.id },
      data: isDownload
        ? { downloadCount: { increment: 1 }, lastAccessedAt: new Date() }
        : { previewCount: { increment: 1 }, lastAccessedAt: new Date() }
    });
  } catch {
    // Activity tracking must never break the actual file stream.
  }

  // Range requests let PDF.js stream pages progressively instead of pulling
  // the whole file first.
  if (source.contentRange) {
    res.status(206);
    res.set({ "Content-Range": source.contentRange, "Content-Length": source.size });
  } else {
    res.status(200);
    res.set("Content-Length", source.size);
  }
  source.stream.pipe(res);
}

// Uploaded profile photos/covers are served from storage/media/<userId>/.
// Access is restricted: only the owner (valid session cookie) or anyone while
// the owner's profile is marked public may fetch them.
export async function streamMedia(req, res) {
  const { userId, filename } = req.params;
  if (!/^(photo|cover)\.[a-zA-Z0-9]+$/.test(filename || "")) {
    return res.status(403).json({ message: "Invalid media path." });
  }

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, privacy: true }
  });
  if (!owner) return res.status(404).json({ message: "Profile not found." });

  let isOwner = false;
  const token = req.cookies?.upnex_token;
  if (token) {
    try {
      isOwner = verifyToken(token)?.id === userId;
    } catch {
      isOwner = false;
    }
  }
  // Mirrors the public profile logic: a null/missing privacy dict means the
  // profile defaults to public, so anonymous visitors may fetch the media.
  if (!isOwner && !isPublic(owner.privacy, "profile")) {
    return res.status(403).json({ message: "This profile is private." });
  }

  const source = await openFile({ key: `${userId}/${filename}`, root: mediaStorageRoot() });
  if (!source) {
    return res.status(404).json({ message: "Media not found." });
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeByExt = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif"
  };
  res.set({
    "Content-Type": mimeByExt[ext] || "application/octet-stream",
    "Content-Length": source.size,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff"
  });
  res.status(200);
  source.stream.pipe(res);
}