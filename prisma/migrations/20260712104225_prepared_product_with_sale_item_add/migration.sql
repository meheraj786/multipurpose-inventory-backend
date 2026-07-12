-- CreateEnum
CREATE TYPE "SaleItemType" AS ENUM ('PRODUCT', 'PREPARED_PRODUCT');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "preparedProductId" TEXT;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "itemType" "SaleItemType" NOT NULL DEFAULT 'PRODUCT',
ADD COLUMN     "preparedProductId" TEXT;

-- CreateIndex
CREATE INDEX "SaleItem_preparedProductId_idx" ON "SaleItem"("preparedProductId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_preparedProductId_fkey" FOREIGN KEY ("preparedProductId") REFERENCES "PreparedProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_preparedProductId_fkey" FOREIGN KEY ("preparedProductId") REFERENCES "PreparedProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
