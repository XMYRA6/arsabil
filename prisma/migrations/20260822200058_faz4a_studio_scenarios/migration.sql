-- CreateTable
CREATE TABLE "StudioScenario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parcelIdentity" TEXT,
    "baseInputHash" TEXT NOT NULL,
    "parcelSourceStatus" TEXT NOT NULL DEFAULT 'demo',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioScenarioVersion" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "summaryNotes" TEXT,
    "needsRebalance" BOOLEAN NOT NULL DEFAULT false,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioScenarioVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioScenarioAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "versionNumber" INTEGER,
    "eventType" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioScenarioAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioScenario_userId_idx" ON "StudioScenario"("userId");

-- CreateIndex
CREATE INDEX "StudioScenario_isArchived_idx" ON "StudioScenario"("isArchived");

-- CreateIndex
CREATE INDEX "StudioScenarioVersion_scenarioId_idx" ON "StudioScenarioVersion"("scenarioId");

-- CreateIndex
CREATE INDEX "StudioScenarioVersion_snapshotHash_idx" ON "StudioScenarioVersion"("snapshotHash");

-- CreateIndex
CREATE UNIQUE INDEX "StudioScenarioVersion_scenarioId_versionNumber_key" ON "StudioScenarioVersion"("scenarioId", "versionNumber");

-- CreateIndex
CREATE INDEX "StudioScenarioAuditLog_scenarioId_idx" ON "StudioScenarioAuditLog"("scenarioId");

-- CreateIndex
CREATE INDEX "StudioScenarioAuditLog_userId_idx" ON "StudioScenarioAuditLog"("userId");

-- AddForeignKey
ALTER TABLE "StudioScenario" ADD CONSTRAINT "StudioScenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioScenarioVersion" ADD CONSTRAINT "StudioScenarioVersion_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "StudioScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
