-- AlterTable
ALTER TABLE "ProjeKarti" ADD COLUMN     "result" JSONB;

-- CreateTable
CREATE TABLE "KonutFiyatStat" (
    "id" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL DEFAULT '',
    "mahalle" TEXT NOT NULL DEFAULT '',
    "scope" TEXT NOT NULL,
    "medianPricePerSqm" DOUBLE PRECISION NOT NULL,
    "p25" DOUBLE PRECISION NOT NULL,
    "p75" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "medianAreaSqm" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KonutFiyatStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KonutFiyatStat_il_ilce_mahalle_key" ON "KonutFiyatStat"("il", "ilce", "mahalle");
