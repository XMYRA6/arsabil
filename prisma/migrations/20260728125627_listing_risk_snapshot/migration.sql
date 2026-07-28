-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "faultDistanceM" INTEGER,
ADD COLUMN     "floodQ100" BOOLEAN,
ADD COLUMN     "riskSnapshotAt" TIMESTAMP(3);
