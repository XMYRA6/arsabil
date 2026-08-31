-- CreateTable
CREATE TABLE "AkifTurnLog" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "estCostUsd" DOUBLE PRECISION NOT NULL,
    "intent" TEXT NOT NULL,
    "tool" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AkifTurnLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AkifTurnLog_conversationId_idx" ON "AkifTurnLog"("conversationId");

-- CreateIndex
CREATE INDEX "AkifTurnLog_createdAt_idx" ON "AkifTurnLog"("createdAt");
