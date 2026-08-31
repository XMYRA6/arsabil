-- CreateTable
CREATE TABLE "WhatsappSubscription" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "mahalle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDigestMonth" TEXT,
    "lastAlertAt" TIMESTAMP(3),
    "lastAlertDirection" TEXT,

    CONSTRAINT "WhatsappSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSubscription_phone_il_ilce_mahalle_key" ON "WhatsappSubscription"("phone", "il", "ilce", "mahalle");

-- CreateIndex
CREATE INDEX "WhatsappSubscription_il_ilce_mahalle_idx" ON "WhatsappSubscription"("il", "ilce", "mahalle");
