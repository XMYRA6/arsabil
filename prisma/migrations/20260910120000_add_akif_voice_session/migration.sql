-- CreateTable
CREATE TABLE "AkifVoiceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "reconnectCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "AkifVoiceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AkifVoiceSession_userId_createdAt_idx" ON "AkifVoiceSession"("userId", "createdAt");
