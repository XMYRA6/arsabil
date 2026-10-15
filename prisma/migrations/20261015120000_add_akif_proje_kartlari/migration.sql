-- AlterTable
ALTER TABLE "User" ADD COLUMN     "whatsappPhone" TEXT;

-- CreateTable
CREATE TABLE "ParselDosyasi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "mahalle" TEXT NOT NULL,
    "ada" TEXT NOT NULL,
    "parsel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParselDosyasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParselOlgu" (
    "id" TEXT NOT NULL,
    "parselDosyasiId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "ParselOlgu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjeKarti" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "inputs" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjeKarti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjeKartiParsel" (
    "projeKartiId" TEXT NOT NULL,
    "parselDosyasiId" TEXT NOT NULL,

    CONSTRAINT "ProjeKartiParsel_pkey" PRIMARY KEY ("projeKartiId","parselDosyasiId")
);

-- CreateTable
CREATE TABLE "ProjeRevizyon" (
    "id" TEXT NOT NULL,
    "projeKartiId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "ProjeRevizyon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneClaim" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "draft" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_whatsappPhone_key" ON "User"("whatsappPhone");

-- CreateIndex
CREATE UNIQUE INDEX "ParselDosyasi_userId_il_ilce_mahalle_ada_parsel_key" ON "ParselDosyasi"("userId", "il", "ilce", "mahalle", "ada", "parsel");

-- CreateIndex
CREATE INDEX "ParselOlgu_parselDosyasiId_key_supersededAt_idx" ON "ParselOlgu"("parselDosyasiId", "key", "supersededAt");

-- CreateIndex
CREATE INDEX "ProjeKarti_userId_createdAt_idx" ON "ProjeKarti"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjeRevizyon_projeKartiId_changedAt_idx" ON "ProjeRevizyon"("projeKartiId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneClaim_tokenHash_key" ON "PhoneClaim"("tokenHash");

-- CreateIndex
CREATE INDEX "PhoneClaim_phone_idx" ON "PhoneClaim"("phone");

-- AddForeignKey
ALTER TABLE "ParselDosyasi" ADD CONSTRAINT "ParselDosyasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParselOlgu" ADD CONSTRAINT "ParselOlgu_parselDosyasiId_fkey" FOREIGN KEY ("parselDosyasiId") REFERENCES "ParselDosyasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeKarti" ADD CONSTRAINT "ProjeKarti_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeKartiParsel" ADD CONSTRAINT "ProjeKartiParsel_projeKartiId_fkey" FOREIGN KEY ("projeKartiId") REFERENCES "ProjeKarti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeKartiParsel" ADD CONSTRAINT "ProjeKartiParsel_parselDosyasiId_fkey" FOREIGN KEY ("parselDosyasiId") REFERENCES "ParselDosyasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjeRevizyon" ADD CONSTRAINT "ProjeRevizyon_projeKartiId_fkey" FOREIGN KEY ("projeKartiId") REFERENCES "ProjeKarti"("id") ON DELETE CASCADE ON UPDATE CASCADE;
