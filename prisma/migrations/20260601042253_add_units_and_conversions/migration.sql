/*
  Warnings:

  - The `totalStock` column on the `RawProduct` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `unitId` to the `PreparedProduct` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitId` to the `ProductStock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `convertedQty` to the `SaleItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitId` to the `SaleItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UnitGroup" AS ENUM ('WEIGHT', 'VOLUME', 'LENGTH', 'COUNT', 'AREA');

-- AlterTable
ALTER TABLE "PreparedProduct" ADD COLUMN     "unitId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PreparedProductItem" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "PreparedProductStock" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "unitId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ProductStock" ADD COLUMN     "unitId" TEXT NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Purchase" ALTER COLUMN "qty" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "RawProduct" DROP COLUMN "totalStock",
ADD COLUMN     "totalStock" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RawProductStock" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "convertedQty" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "unitId" TEXT NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Wastage" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "group" "UnitGroup" NOT NULL,
    "conversionFactor" DECIMAL(65,30) NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductUnitConversion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "conversionFactor" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductUnitConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unit_symbol_key" ON "Unit"("symbol");

-- CreateIndex
CREATE INDEX "Unit_group_idx" ON "Unit"("group");

-- CreateIndex
CREATE INDEX "Unit_symbol_idx" ON "Unit"("symbol");

-- CreateIndex
CREATE INDEX "ProductUnitConversion_productId_idx" ON "ProductUnitConversion"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnitConversion_productId_unitId_key" ON "ProductUnitConversion"("productId", "unitId");

-- AddForeignKey
ALTER TABLE "ProductUnitConversion" ADD CONSTRAINT "ProductUnitConversion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUnitConversion" ADD CONSTRAINT "ProductUnitConversion_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProduct" ADD CONSTRAINT "RawProduct_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparedProduct" ADD CONSTRAINT "PreparedProduct_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
