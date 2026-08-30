-- CreateTable
CREATE TABLE "AreaPriceTrend" (
    "id" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT,
    "mahalle" TEXT,
    "scope" TEXT NOT NULL,
    "monthBucket" TIMESTAMP(3) NOT NULL,
    "medianPricePerSqm" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaPriceTrend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AreaPriceTrend_il_ilce_mahalle_monthBucket_key" ON "AreaPriceTrend"("il", "ilce", "mahalle", "monthBucket");

-- CreateIndex
CREATE INDEX "AreaPriceTrend_il_ilce_mahalle_idx" ON "AreaPriceTrend"("il", "ilce", "mahalle");
