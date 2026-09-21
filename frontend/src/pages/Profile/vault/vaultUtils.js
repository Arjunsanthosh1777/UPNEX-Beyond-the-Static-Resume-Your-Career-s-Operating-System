import JSZip from "jszip";
import api from "../../../services/api";

// The backend origin is runtime-configurable: UPNEX_API_BASE carries the full
// API base ("https://host/api") for cross-origin deploys, while locally it is
// empty and the Vite proxy serves /api same-origin. Storage URLs are absolute
// server paths (/api/storage/file?token=...), so resolve them against the
// origin derived from that base rather than double-prefixing the /api segment.
const API_BASE = (typeof window !== "undefined" && window.UPNEX_API_BASE) || "";
function resolveStorageUrl(url) {
  if (!API_BASE) return url;
  const origin = API_BASE.startsWith("http") ? new URL(API_BASE).origin : "";
  return origin ? origin + url : url;
}

export function getDocumentAccess(documentId, action = "preview") {
  return api.post(`/profile/documents/${documentId}/access`, { action }).then((response) => {
    response.data.url = resolveStorageUrl(response.data.url);
    return response.data;
  });
}

export function updateDocument(documentId, fields) {
  return api.patch(`/profile/documents/${documentId}`, fields).then((response) => response.data.document);
}

export function deleteDocument(documentId) {
  return api.delete(`/profile/documents/${documentId}`);
}

export async function downloadDocument(document) {
  const { url, filename } = await getDocumentAccess(document.id, "download");
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename || document.fileName || "document";
  window.document.body.appendChild(link);
  link.click();
  link.remove();
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Client-side ZIP of individually authorized files. Each file streams through
// its own short-lived signed URL, so participation in the archive is exactly
// the set the backend is willing to hand out.
export async function downloadSelectedAsZip(documents) {
  const zip = new JSZip();
  const used = new Set();
  let skipped = 0;

  for (const document of documents) {
    try {
      const { url, filename } = await getDocumentAccess(document.id, "download");
      const response = await fetch(url);
      if (!response.ok) {
        skipped += 1;
        continue;
      }
      const name = filename || document.fileName || `document_${document.id}`;
      let unique = name;
      let counter = 1;
      while (used.has(unique)) {
        const dot = name.lastIndexOf(".");
        unique = `${name.slice(0, dot === -1 ? name.length : dot)} (${counter}).pdf`;
        counter += 1;
      }
      used.add(unique);
      zip.file(unique, await response.blob());
    } catch {
      skipped += 1;
    }
  }

  if (Object.keys(zip.files).filter((name) => !zip.file(name).dir).length === 0) {
    throw new Error(skipped ? "Couldn't download any of the selected documents." : "No documents selected.");
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  saveBlob(blob, "UPNEX_Documents.zip");
  return skipped;
}