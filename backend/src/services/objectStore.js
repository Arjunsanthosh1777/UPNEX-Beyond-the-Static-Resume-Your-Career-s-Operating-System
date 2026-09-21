// Optional object-storage backend (Cloudflare R2 or any S3-compatible bucket).
//
// When R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET are
// all set, every file (vault documents + profile photos/covers) lives in the
// bucket, which survives redeploys and scales across instances. Without them,
// files stay on local disk so local development works unchanged.
//
// The S3 SDK is loaded lazily and only when the R2 configuration exists, so
// the disk fallback keeps running even if the package was never installed
// with it.

import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { storageDir } from "../utils/files.js";

const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];

export function objectStoreConfigured() {
  return R2_VARS.every((name) => String(process.env[name] || "").trim() !== "");
}

// Local roots used when the object store is off. Docs and media live under
// sibling folders so a single STORAGE_DIR override relocates both.
export function defaultStorageRoot() {
  return storageDir();
}

export function mediaStorageRoot() {
  const base = process.env.STORAGE_DIR
    ? path.resolve(process.env.STORAGE_DIR)
    : path.resolve(process.cwd(), "storage");
  return path.join(base, "media");
}

function diskPath(root, key) {
  const filePath = path.resolve(root, key);
  if (!filePath.startsWith(root + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return filePath;
}

let s3;
async function client() {
  if (s3) return s3;
  const { S3Client } = await import("@aws-sdk/client-s3");
  s3 = new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });
  return s3;
}

async function s3Command(name, params) {
  const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const Command = { PutObjectCommand, DeleteObjectCommand, GetObjectCommand }[name];
  return (await client()).send(new Command({ Bucket: process.env.R2_BUCKET, ...params }));
}

export async function putFile({ key, data, contentType, root = defaultStorageRoot() }) {
  if (objectStoreConfigured()) {
    await s3Command("PutObjectCommand", {
      Key: key,
      Body: data,
      ...(contentType ? { ContentType: contentType } : {})
    });
    return;
  }
  const filePath = diskPath(root, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
}

export async function deleteFile({ key, root = defaultStorageRoot() }) {
  if (objectStoreConfigured()) {
    try {
      await s3Command("DeleteObjectCommand", { Key: key });
    } catch {
      // Deleting a missing object is a no-op by S3 semantics.
    }
    return;
  }
  await fs.rm(diskPath(root, key), { force: true }).catch(() => {});
}

// Returns { stream, size, contentRange?, invalidRange? } or null when the file
// does not exist. `range` is a raw HTTP Range header forwarded to R2 (native
// range support) or honoured against the local file.
export async function openFile({ key, root = defaultStorageRoot(), range }) {
  if (objectStoreConfigured()) {
    try {
      const response = await s3Command("GetObjectCommand", {
        Key: key,
        ...(range ? { Range: range } : {})
      });
      return {
        stream: toNodeStream(response.Body),
        size: Number(response.ContentLength),
        contentRange: response.ContentRange
      };
    } catch (error) {
      if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NoSuchKey") return null;
      if (error?.$metadata?.httpStatusCode === 416) {
        return { stream: null, size: 0, invalidRange: true };
      }
      throw error;
    }
  }

  const filePath = diskPath(root, key);
  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return null;
  }

  const total = stat.size;
  const match = typeof range === "string" && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (match) {
    const requestedStart = match[1] === "" ? undefined : Number(match[1]);
    const requestedEnd = match[2] === "" ? undefined : Number(match[2]);
    let start = requestedStart ?? 0;
    let end = requestedEnd ?? total - 1;
    if (requestedStart === undefined && requestedEnd !== undefined) {
      start = Math.max(0, total - requestedEnd);
      end = total - 1;
    }
    if (start >= total || end < start || end >= total) {
      return { stream: null, size: 0, invalidRange: true };
    }
    return {
      stream: createReadStream(filePath, { start, end }),
      size: end - start + 1,
      contentRange: `bytes ${start}-${end}/${total}`
    };
  }

  return { stream: createReadStream(filePath), size: total };
}

// The S3 SDK returns a Node stream in Node runtimes, but a web ReadableStream
// in some bundler/runtime configurations — normalise to a Node stream either way.
function toNodeStream(body) {
  if (body && typeof body.getReader === "function") return Readable.fromWeb(body);
  return body;
}

// Reads a whole file into memory. Used by analytics (OCR) and integrity checks;
// the streaming path above remains the default for file delivery.
export async function readBuffer({ key, root = defaultStorageRoot() }) {
  if (objectStoreConfigured()) {
    const chunks = [];
    const source = await openFile({ key, root });
    if (!source) return null;
    for await (const chunk of source.stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
  const filePath = diskPath(root, key);
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}