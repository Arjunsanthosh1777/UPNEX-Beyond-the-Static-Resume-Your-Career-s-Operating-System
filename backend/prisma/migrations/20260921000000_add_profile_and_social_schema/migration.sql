-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "demoUrl" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repoUrl" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "thumbnailUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "availability" TEXT,
ADD COLUMN     "careerGoal" TEXT,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "education" JSONB,
ADD COLUMN     "emailPrefs" JSONB,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "interests" JSONB,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "openTo" JSONB,
ADD COLUMN     "preferredLanguage" TEXT,
ADD COLUMN     "privacy" JSONB,
ADD COLUMN     "profilePublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "skills" JSONB,
ADD COLUMN     "social" JSONB,
ADD COLUMN     "targetRole" TEXT;

-- AlterTable
ALTER TABLE "VaultDocument" ADD COLUMN     "issuer" TEXT;

-- CreateTable
CREATE TABLE "ProfileExperience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'internship',
    "startDate" TEXT,
    "endDate" TEXT,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "skills" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileLearning" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "category" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startDate" TEXT,
    "targetDate" TEXT,
    "resource" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileLearning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT,
    "category" TEXT NOT NULL DEFAULT 'competition',
    "date" TEXT,
    "description" TEXT,
    "proofUrl" TEXT,
    "imageUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT,
    "refType" TEXT,
    "actorUsername" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileExperience_userId_sortOrder_idx" ON "ProfileExperience"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProfileLearning_userId_idx" ON "ProfileLearning"("userId");

-- CreateIndex
CREATE INDEX "Achievement_userId_createdAt_idx" ON "Achievement"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileEvent_userId_createdAt_idx" ON "ProfileEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileEvent_userId_kind_createdAt_idx" ON "ProfileEvent"("userId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "ProfileExperience" ADD CONSTRAINT "ProfileExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileLearning" ADD CONSTRAINT "ProfileLearning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxEmail" ADD CONSTRAINT "OutboxEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileEvent" ADD CONSTRAINT "ProfileEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;