-- AlterTable
ALTER TABLE "PreparedProductStock" ADD COLUMN     "batch" TEXT,
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "manufactureDate" TIMESTAMP(3);
