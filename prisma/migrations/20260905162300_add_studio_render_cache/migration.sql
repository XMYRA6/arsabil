-- CreateTable
CREATE TABLE "StudioRenderCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "estCostUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioRenderCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioRenderCache_userId_cacheKey_key" ON "StudioRenderCache"("userId", "cacheKey");

-- CreateIndex
CREATE INDEX "StudioRenderCache_userId_idx" ON "StudioRenderCache"("userId");

-- CreateIndex
CREATE INDEX "StudioRenderCache_createdAt_idx" ON "StudioRenderCache"("createdAt");
