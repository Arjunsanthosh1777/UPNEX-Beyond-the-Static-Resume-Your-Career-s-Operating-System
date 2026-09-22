-- CreateTable
CREATE TABLE "ClashGame" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "hostId" TEXT NOT NULL,
    "guestId" TEXT,
    "winnerId" TEXT,
    "questionOrder" JSONB,
    "scoreHost" INTEGER NOT NULL DEFAULT 0,
    "scoreGuest" INTEGER NOT NULL DEFAULT 0,
    "qIndex" INTEGER NOT NULL DEFAULT 0,
    "qDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ClashGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClashGame_code_key" ON "ClashGame"("code");

-- CreateIndex
CREATE INDEX "ClashGame_status_createdAt_idx" ON "ClashGame"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ClashGame_hostId_status_idx" ON "ClashGame"("hostId", "status");

-- AddForeignKey
ALTER TABLE "ClashGame" ADD CONSTRAINT "ClashGame_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClashGame" ADD CONSTRAINT "ClashGame_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ClashAnswer" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "qIndex" INTEGER NOT NULL,
    "answerIndex" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "timeLeft" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClashAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClashAnswer_gameId_userId_qIndex_key" ON "ClashAnswer"("gameId", "userId", "qIndex");

-- CreateIndex
CREATE INDEX "ClashAnswer_gameId_userId_idx" ON "ClashAnswer"("gameId", "userId");

-- AddForeignKey
ALTER TABLE "ClashAnswer" ADD CONSTRAINT "ClashAnswer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "ClashGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClashAnswer" ADD CONSTRAINT "ClashAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "clashPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "clashWins" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "clashGames" INTEGER NOT NULL DEFAULT 0;