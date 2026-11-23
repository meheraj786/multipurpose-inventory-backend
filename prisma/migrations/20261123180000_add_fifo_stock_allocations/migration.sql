CREATE TABLE "SaleItemStockAllocation" (
    "id" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "productStockId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "saleQuantity" DECIMAL(65,30),
    "unitCost" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SaleItemStockAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WastageStockAllocation" (
    "id" TEXT NOT NULL,
    "wastageId" TEXT NOT NULL,
    "productStockId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WastageStockAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerReturnStockAllocation" (
    "id" TEXT NOT NULL,
    "customerReturnId" TEXT NOT NULL,
    "productStockId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerReturnStockAllocation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CustomerReturn" ADD COLUMN "saleItemId" TEXT;

UPDATE "ProductStock"
SET "totalCost" = "quantity" * "purchasePrice";

CREATE INDEX "SaleItemStockAllocation_saleItemId_idx" ON "SaleItemStockAllocation"("saleItemId");
CREATE INDEX "SaleItemStockAllocation_productStockId_idx" ON "SaleItemStockAllocation"("productStockId");
CREATE INDEX "WastageStockAllocation_wastageId_idx" ON "WastageStockAllocation"("wastageId");
CREATE INDEX "WastageStockAllocation_productStockId_idx" ON "WastageStockAllocation"("productStockId");
CREATE INDEX "CustomerReturnStockAllocation_customerReturnId_idx" ON "CustomerReturnStockAllocation"("customerReturnId");
CREATE INDEX "CustomerReturnStockAllocation_productStockId_idx" ON "CustomerReturnStockAllocation"("productStockId");
CREATE INDEX "CustomerReturn_saleItemId_idx" ON "CustomerReturn"("saleItemId");

ALTER TABLE "SaleItemStockAllocation"
ADD CONSTRAINT "SaleItemStockAllocation_saleItemId_fkey"
FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SaleItemStockAllocation"
ADD CONSTRAINT "SaleItemStockAllocation_productStockId_fkey"
FOREIGN KEY ("productStockId") REFERENCES "ProductStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WastageStockAllocation"
ADD CONSTRAINT "WastageStockAllocation_wastageId_fkey"
FOREIGN KEY ("wastageId") REFERENCES "Wastage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WastageStockAllocation"
ADD CONSTRAINT "WastageStockAllocation_productStockId_fkey"
FOREIGN KEY ("productStockId") REFERENCES "ProductStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerReturnStockAllocation"
ADD CONSTRAINT "CustomerReturnStockAllocation_customerReturnId_fkey"
FOREIGN KEY ("customerReturnId") REFERENCES "CustomerReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerReturnStockAllocation"
ADD CONSTRAINT "CustomerReturnStockAllocation_productStockId_fkey"
FOREIGN KEY ("productStockId") REFERENCES "ProductStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerReturn"
ADD CONSTRAINT "CustomerReturn_saleItemId_fkey"
FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
