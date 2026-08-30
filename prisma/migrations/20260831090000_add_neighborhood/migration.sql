-- CreateTable
CREATE TABLE "Neighborhood" (
    "id" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "mahalle" TEXT NOT NULL,
    "geojson" JSONB,
    "emlakjetRiskScore" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Neighborhood_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Neighborhood_il_ilce_mahalle_key" ON "Neighborhood"("il", "ilce", "mahalle");
