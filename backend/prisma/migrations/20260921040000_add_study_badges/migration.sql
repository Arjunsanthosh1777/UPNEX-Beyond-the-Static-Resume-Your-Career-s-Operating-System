-- CreateTable
CREATE TABLE "StudyBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyBadge_userId_idx" ON "StudyBadge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyBadge_userId_code_key" ON "StudyBadge"("userId", "code");

-- AddForeignKey
ALTER TABLE "StudyBadge" ADD CONSTRAINT "StudyBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;