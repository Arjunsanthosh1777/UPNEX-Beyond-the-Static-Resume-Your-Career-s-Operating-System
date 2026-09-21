import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { Writable } from "node:stream";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const SECRET = "test-vault-secret";
const tmpRoot = path.join(os.tmpdir(), `upnex-vault-test-${Date.now()}`);

vi.mock("../src/config/database.js", () => ({
  prisma: {
    vaultDocument: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    }
  }
}));

import { prisma } from "../src/config/database.js";
import { signAccessToken, verifyAccessToken } from "../src/utils/signedUrl.js";
import { buildStorageKey, friendlyDownloadName, previewKind, verificationIdFor, storageDir } from "../src/utils/files.js";
import { getDocumentAccess } from "../src/controllers/profileController.js";
import { streamFile } from "../src/controllers/storageController.js";

function docFixture(overrides = {}) {
  return {
    id: "doc-owner-a",
    userId: "user-a",
    fileName: "semester4_marksheet_2026.pdf",
    documentType: "MARKSHEET",
    fileSize: 2048,
    mime: "application/pdf",
    originalName: "semester4_marksheet_2026.pdf",
    storageKey: buildStorageKey("owner-file", "application/pdf"),
    verified: false,
    createdAt: new Date(),
    downloadCount: 0,
    previewCount: 0,
    ...overrides
  };
}

function collectRes() {
  const state = { statusCode: 200, headers: {}, body: [], json: null };
  const res = new Writable({
    write(chunk, _enc, cb) { state.body.push(chunk); cb(); }
  });
  res.status = (code) => { state.statusCode = code; return res; };
  res.set = (obj) => { Object.assign(state.headers, obj); return res; };
  res.json = (obj) => { state.json = obj; return res; };
  res.state = state;
  res.done = new Promise((resolve) => res.on("finish", resolve));
  return res;
}

function makeReq(overrides = {}) {
  return {
    body: {},
    params: {},
    auth: { id: "user-a" },
    headers: {},
    protocol: "http",
    get: () => "api.local",
    ...overrides
  };
}

beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  process.env.STORAGE_DIR = tmpRoot;
  await fs.mkdir(path.join(storageDir(), "docs"), { recursive: true });
});

afterAll(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.vaultDocument.update.mockResolvedValue({});
});

describe("signedUrl", () => {
  it("round-trips a valid token", () => {
    const token = signAccessToken({ documentId: "d1", userId: "u1", action: "preview", expiresInSec: 600 });
    const payload = verifyAccessToken(token);
    expect(payload).toMatchObject({ v: 1, d: "d1", u: "u1", a: "preview" });
  });

  it("rejects a tampered payload", () => {
    const token = signAccessToken({ documentId: "d1", userId: "u1", action: "preview", expiresInSec: 600 });
    const [payload, sig] = token.split(".");
    const tampered = Buffer.from(Buffer.from(payload, "base64url").toString("utf8").replace("d1", "d2")).toString("base64url");
    expect(verifyAccessToken(`${tampered}.${sig}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signAccessToken({ documentId: "d1", userId: "u1", action: "preview", expiresInSec: 600 });
    const future = Date.now() + (601 * 1000);
    expect(verifyAccessToken(token, { now: future })).toBeNull();
  });

  it("rejects a token signed for a different action", () => {
    const token = signAccessToken({ documentId: "d1", userId: "u1", action: "preview", expiresInSec: 600 });
    const [payload] = token.split(".");
    const forged = Buffer.from(Buffer.from(payload, "base64url").toString("utf8").replace('"a":"preview"', '"a":"download"')).toString("base64url");
    const [_p, sig] = token.split(".");
    expect(verifyAccessToken(`${forged}.${sig}`)).toBeNull();
  });
});

describe("file helpers", () => {
  it("builds a friendly download name from an underscored filename", () => {
    expect(friendlyDownloadName("semester4_marksheet_2026.pdf")).toBe("Semester4_Marksheet_2026.pdf");
  });
  it("preserves already-clean names", () => {
    expect(friendlyDownloadName("react-certificate.pdf")).toBe("React_Certificate.pdf");
  });
  it("falls back for empty names", () => {
    expect(friendlyDownloadName("")).toBe("UPNEX_Document");
  });
  it("classifies preview kinds", () => {
    expect(previewKind("application/pdf")).toBe("pdf");
    expect(previewKind("image/png")).toBe("image");
    expect(previewKind("text/csv")).toBe("unsupported");
  });
  it("keeps storage keys server-controlled and extension-suffixed", () => {
    const key = buildStorageKey("abc", "image/jpeg");
    expect(key).toBe("docs/abc.jpg");
    expect(verificationIdFor("abcdefgh")).toBe("UPX-ABCDEFGH");
  });
});

describe("getDocumentAccess (profileController)", () => {
  it("issues a valid short-lived preview URL to the owner", async () => {
    prisma.vaultDocument.findFirst.mockResolvedValue(docFixture());
    const req = makeReq({ params: { id: "doc-owner-a" }, body: { action: "preview" } });
    const res = { json: vi.fn() };

    await getDocumentAccess(req, res);

    const { url, action, expiresIn } = res.json.mock.calls[0][0];
    expect(action).toBe("preview");
    expect(expiresIn).toBe(600);
    expect(url).toMatch(/^\/api\/storage\/file\?token=/);
    const token = new URL(url, "http://localhost").searchParams.get("token");
    expect(verifyAccessToken(token)).toMatchObject({ d: "doc-owner-a", u: "user-a", a: "preview" });
  });

  it("returns 404 for a document the caller does not own", async () => {
    prisma.vaultDocument.findFirst.mockResolvedValue(null);
    const req = makeReq({ auth: { id: "user-b" }, params: { id: "doc-owner-a" }, body: { action: "download" } });
    const res = { status: vi.fn(() => res), json: vi.fn() };

    await getDocumentAccess(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Document not found." });
  });

  it("refuses access to a metadata-only document", async () => {
    prisma.vaultDocument.findFirst.mockResolvedValue(docFixture({ storageKey: null }));
    const req = makeReq({ params: { id: "doc-owner-a" }, body: { action: "preview" } });
    const res = { status: vi.fn(() => res), json: vi.fn() };

    await getDocumentAccess(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe("streamFile (storageController)", () => {
  it("streams an owner's file with an attachment disposition on download", async () => {
    const document = docFixture({ storageKey: buildStorageKey("stream-file", "application/pdf") });
    const filePath = path.join(storageDir(), document.storageKey);
    await fs.writeFile(filePath, "fake pdf bytes");
    prisma.vaultDocument.findFirst.mockResolvedValue(document);
    const token = signAccessToken({ documentId: document.id, userId: "user-a", action: "download", expiresInSec: 600 });
    const req = makeReq({ query: { token } });
    const res = collectRes();

    await streamFile(req, res);
    await res.done;

    expect(res.state.statusCode).toBe(200);
    expect(res.state.headers["Content-Disposition"]).toContain("attachment");
    const body = Buffer.concat(res.state.body).toString("utf8");
    expect(body).toBe("fake pdf bytes");
  });

  it("serves a 206 range for progressive PDF loading", async () => {
    const document = docFixture({ storageKey: buildStorageKey("stream-file", "application/pdf") });
    const filePath = path.join(storageDir(), document.storageKey);
    await fs.writeFile(filePath, "0123456789abcdef");
    prisma.vaultDocument.findFirst.mockResolvedValue(document);
    const token = signAccessToken({ documentId: document.id, userId: "user-a", action: "preview", expiresInSec: 600 });
    const req = makeReq({ query: { token }, headers: { range: "bytes=0-3" } });
    const res = collectRes();

    await streamFile(req, res);
    await res.done;

    expect(res.state.statusCode).toBe(206);
    expect(res.state.headers["Content-Range"]).toBe("bytes 0-3/16");
    expect(Buffer.concat(res.state.body).toString("utf8")).toBe("0123");
    await fs.rm(filePath, { force: true });
  });

  it("rejects an expired or invalid token with 401", async () => {
    const req = makeReq({ query: { token: "garbage.token" } });
    const res = collectRes();

    await streamFile(req, res);

    expect(res.state.statusCode).toBe(401);
    expect(res.state.json.message).toMatch(/invalid or has expired/i);
  });

  it("returns 404 for a document that was deleted or belongs to someone else", async () => {
    prisma.vaultDocument.findFirst.mockResolvedValue(null);
    const token = signAccessToken({ documentId: "doc-owner-a", userId: "user-a", action: "preview", expiresInSec: 600 });
    const req = makeReq({ query: { token } });
    const res = collectRes();

    await streamFile(req, res);

    expect(res.state.statusCode).toBe(404);
    expect(res.state.json.message).toMatch(/no longer available/i);
  });

  it("returns 404 when the underlying file is missing (deleted on disk)", async () => {
    prisma.vaultDocument.findFirst.mockResolvedValue(docFixture({ storageKey: buildStorageKey("missing-file", "application/pdf") }));
    const token = signAccessToken({ documentId: "doc-owner-a", userId: "user-a", action: "preview", expiresInSec: 600 });
    const req = makeReq({ query: { token } });
    const res = collectRes();

    await streamFile(req, res);

    expect(res.state.statusCode).toBe(404);
    expect(res.state.json.message).toMatch(/missing/i);
  });
});