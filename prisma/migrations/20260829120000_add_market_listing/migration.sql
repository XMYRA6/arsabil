-- CreateTable
CREATE TABLE "MarketListing" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceListingId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "areaSqm" DOUBLE PRECISION,
    "pricePerSqm" DOUBLE PRECISION,
    "listingType" TEXT NOT NULL,
    "imarStatus" TEXT,
    "il" TEXT,
    "ilce" TEXT,
    "mahalle" TEXT,
    "adaNo" TEXT,
    "parselNo" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "geoPrecision" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "listedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dupeOfId" TEXT,
    "rawJson" JSONB,

    CONSTRAINT "MarketListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketListingPricePoint" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketListingPricePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "listingsFound" INTEGER NOT NULL DEFAULT 0,
    "listingsUpserted" INTEGER NOT NULL DEFAULT 0,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "CrawlRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketListing_source_sourceListingId_key" ON "MarketListing"("source", "sourceListingId");

-- CreateIndex
CREATE INDEX "MarketListing_il_ilce_mahalle_idx" ON "MarketListing"("il", "ilce", "mahalle");

-- CreateIndex
CREATE INDEX "MarketListing_listingType_status_idx" ON "MarketListing"("listingType", "status");

-- CreateIndex
CREATE INDEX "MarketListing_lat_lng_idx" ON "MarketListing"("lat", "lng");

-- CreateIndex
CREATE INDEX "MarketListingPricePoint_listingId_idx" ON "MarketListingPricePoint"("listingId");

-- AddForeignKey
ALTER TABLE "MarketListingPricePoint" ADD CONSTRAINT "MarketListingPricePoint_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
