-- CreateTable
CREATE TABLE "AreaPriceStat" (
    "id" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT,
    "mahalle" TEXT,
    "scope" TEXT NOT NULL,
    "medianPricePerSqm" DOUBLE PRECISION NOT NULL,
    "p25" DOUBLE PRECISION NOT NULL,
    "p75" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaPriceStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AreaPriceStat_il_ilce_mahalle_key" ON "AreaPriceStat"("il", "ilce", "mahalle");

-- CreateIndex
CREATE INDEX "AreaPriceStat_il_ilce_mahalle_idx" ON "AreaPriceStat"("il", "ilce", "mahalle");
