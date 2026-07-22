-- AlterTable
ALTER TABLE "Wastage" ADD COLUMN     "preparedProductId" TEXT,
ADD COLUMN     "rawProductId" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CustomerReturn" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "itemType" "SaleItemType" NOT NULL DEFAULT 'PRODUCT',
    "productId" TEXT,
    "preparedProductId" TEXT,
    "quantity" DECIMAL(65,30) NOT NULL,
    "refundAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "restocked" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerReturn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerReturn_accountId_idx" ON "CustomerReturn"("accountId");

-- CreateIndex
CREATE INDEX "CustomerReturn_saleId_idx" ON "CustomerReturn"("saleId");

-- CreateIndex
CREATE INDEX "CustomerReturn_productId_idx" ON "CustomerReturn"("productId");

-- CreateIndex
CREATE INDEX "CustomerReturn_preparedProductId_idx" ON "CustomerReturn"("preparedProductId");

-- CreateIndex
CREATE INDEX "Wastage_rawProductId_idx" ON "Wastage"("rawProductId");

-- CreateIndex
CREATE INDEX "Wastage_preparedProductId_idx" ON "Wastage"("preparedProductId");

-- AddForeignKey
ALTER TABLE "Wastage" ADD CONSTRAINT "Wastage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wastage" ADD CONSTRAINT "Wastage_rawProductId_fkey" FOREIGN KEY ("rawProductId") REFERENCES "RawProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wastage" ADD CONSTRAINT "Wastage_preparedProductId_fkey" FOREIGN KEY ("preparedProductId") REFERENCES "PreparedProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_preparedProductId_fkey" FOREIGN KEY ("preparedProductId") REFERENCES "PreparedProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
