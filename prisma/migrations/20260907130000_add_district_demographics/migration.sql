-- CreateTable
CREATE TABLE "DistrictDemographics" (
    "id" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "dataYear" INTEGER NOT NULL,
    "population" INTEGER,
    "populationGrowthPerMille" DOUBLE PRECISION,
    "medianAge" DOUBLE PRECISION,
    "avgHouseholdSize" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistrictDemographics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DistrictDemographics_il_ilce_key" ON "DistrictDemographics"("il", "ilce");

-- CreateIndex
CREATE INDEX "DistrictDemographics_il_idx" ON "DistrictDemographics"("il");
