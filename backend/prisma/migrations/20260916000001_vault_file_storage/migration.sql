-- VaultDocument gains real file storage + access tracking.
ALTER TABLE "VaultDocument"
  ADD COLUMN "mime" TEXT,
  ADD COLUMN "originalName" TEXT,
  ADD COLUMN "storageKey" TEXT,
  ADD COLUMN "verificationId" TEXT,
  ADD COLUMN "ocrText" TEXT,
  ADD COLUMN "downloadCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "previewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastAccessedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "VaultDocument_storageKey_key" ON "VaultDocument"("storageKey");