-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "adaNo" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "parcelAreaSqm" DOUBLE PRECISION,
ADD COLUMN     "parcelGeometry" JSONB,
ADD COLUMN     "parcelLookupStatus" TEXT,
ADD COLUMN     "parcelQuality" TEXT,
ADD COLUMN     "parcelVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "parselNo" TEXT;
