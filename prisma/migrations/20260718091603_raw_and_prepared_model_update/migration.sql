-- AlterTable
ALTER TABLE "PreparedProductStock" ADD COLUMN     "costPerUnit" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RawProduct" ADD COLUMN     "averageCost" DECIMAL(65,30) NOT NULL DEFAULT 0;
