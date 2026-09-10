-- CreateTable
CREATE TABLE "AkifPendingAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "undoToken" TEXT,
    "undoUntil" TIMESTAMP(3),
    "createdScenarioId" TEXT,
    "createdProjectId" TEXT,

    CONSTRAINT "AkifPendingAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AkifPendingAction_undoToken_key" ON "AkifPendingAction"("undoToken");

-- CreateIndex
CREATE INDEX "AkifPendingAction_userId_createdAt_idx" ON "AkifPendingAction"("userId", "createdAt");
