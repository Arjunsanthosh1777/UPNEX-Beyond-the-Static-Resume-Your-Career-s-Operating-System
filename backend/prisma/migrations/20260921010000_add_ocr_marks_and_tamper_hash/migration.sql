-- DropIndex
DROP INDEX "AcademicMark_userId_subject_key";

-- AlterTable
ALTER TABLE "AcademicMark" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "docId" TEXT,
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "semester" INTEGER,
ADD COLUMN     "source" TEXT DEFAULT 'manual',
ADD COLUMN     "year" TEXT;

-- AlterTable
ALTER TABLE "VaultDocument" ADD COLUMN     "fileHash" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT;

-- CreateIndex
CREATE INDEX "AcademicMark_userId_idx" ON "AcademicMark"("userId");

-- CreateIndex
CREATE INDEX "AcademicMark_docId_idx" ON "AcademicMark"("docId");

-- AddForeignKey
ALTER TABLE "AcademicMark" ADD CONSTRAINT "AcademicMark_docId_fkey" FOREIGN KEY ("docId") REFERENCES "VaultDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;