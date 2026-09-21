import path from "node:path";

export const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/rtf"
]);

export const MIME_EXTENSION = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/bmp": ".bmp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "text/markdown": ".md",
  "application/rtf": ".rtf"
};

export function storageDir() {
  return process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : path.resolve(process.cwd(), "storage", "documents");
}

// pdf | image | unsupported  — decides which preview surface to use.
export function previewKind(mime) {
  if (mime === "application/pdf") return "pdf";
  if ((mime || "").startsWith("image/")) return "image";
  return "unsupported";
}

// Server-controlled storage key: never derived from user input beyond a
// sanitized extension, never a path that could touch other directories.
export function buildStorageKey(documentId, mime) {
  const ext = (MIME_EXTENSION[mime] || "").replace(/[^a-z0-9.]/g, "").slice(0, 8);
  return path.posix.join("docs", `${documentId}${ext}`);
}

export function safeBasename(name = "") {
  return String(name).split(/[\\/]/).pop().slice(0, 200);
}

// "semester4_marksheet_2026.pdf" -> "Semester4_Marksheet_2026.pdf".
// Windows-safe: no reserved characters, single stem + extension.
export function friendlyDownloadName(originalName) {
  const basename = safeBasename(originalName || "");
  const clean = basename.replace(/[^\w.\- ]/g, "").trim();
  if (!clean) return "UPNEX_Document";
  const ext = path.extname(clean).toLowerCase();
  const stem = path.basename(clean, ext)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const title = stem
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/ /g, "_");
  return `${(title || "UPNEX_Document").slice(0, 80)}${ext}`;
}

// Derives the stable UPNEX verification identifier for a document. Only shown
// on already-verified documents; the badge never self-verifies uploads.
export function verificationIdFor(documentId) {
  return `UPX-${(String(documentId).slice(0, 4) + String(documentId).slice(-4)).toUpperCase()}`;
}

export function requestBaseUrl(req) {
  const proto = (req.headers["x-forwarded-proto"] || "").split(",")[0].trim() || req.protocol || "http";
  return `${proto}://${req.get("host")}`;
}