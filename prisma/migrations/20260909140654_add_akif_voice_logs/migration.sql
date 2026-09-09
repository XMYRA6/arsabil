-- CreateTable
CREATE TABLE "AkifVoiceSessionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSec" INTEGER NOT NULL,
    "toolCalls" INTEGER NOT NULL DEFAULT 0,
    "estCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endReason" TEXT NOT NULL,

    CONSTRAINT "AkifVoiceSessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AkifVoiceTurnLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tool" TEXT,
    "intent" TEXT,
    "estCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AkifVoiceTurnLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AkifVoiceSessionLog_userId_startedAt_idx" ON "AkifVoiceSessionLog"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "AkifVoiceSessionLog_startedAt_idx" ON "AkifVoiceSessionLog"("startedAt");

-- CreateIndex
CREATE INDEX "AkifVoiceTurnLog_sessionId_idx" ON "AkifVoiceTurnLog"("sessionId");
