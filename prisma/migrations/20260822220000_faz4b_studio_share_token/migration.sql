-- CreateTable
CREATE TABLE "StudioShareToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioShareToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioShareToken_token_key" ON "StudioShareToken"("token");

-- CreateIndex
CREATE INDEX "StudioShareToken_token_idx" ON "StudioShareToken"("token");

-- CreateIndex
CREATE INDEX "StudioShareToken_userId_idx" ON "StudioShareToken"("userId");

-- CreateIndex
CREATE INDEX "StudioShareToken_scenarioId_idx" ON "StudioShareToken"("scenarioId");

-- CreateIndex
CREATE INDEX "StudioShareToken_versionId_idx" ON "StudioShareToken"("versionId");

-- AddForeignKey
ALTER TABLE "StudioShareToken" ADD CONSTRAINT "StudioShareToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioShareToken" ADD CONSTRAINT "StudioShareToken_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "StudioScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioShareToken" ADD CONSTRAINT "StudioShareToken_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "StudioScenarioVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
