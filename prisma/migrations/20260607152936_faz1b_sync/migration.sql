-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "address" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "landSizeSqm" DOUBLE PRECISION,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "titleDeed" TEXT,
ADD COLUMN     "zoning" TEXT,
ALTER COLUMN "reportId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false;
