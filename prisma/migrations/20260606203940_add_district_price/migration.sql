-- CreateTable
CREATE TABLE "DistrictPrice" (
    "id" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "avgSalesPricePerM2" DOUBLE PRECISION NOT NULL,
    "avgUnitConstructionPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistrictPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DistrictPrice_il_idx" ON "DistrictPrice"("il");

-- CreateIndex
CREATE UNIQUE INDEX "DistrictPrice_il_ilce_key" ON "DistrictPrice"("il", "ilce");
