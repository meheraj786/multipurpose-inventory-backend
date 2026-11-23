ALTER TABLE "Product" ADD COLUMN "barcode" TEXT;

CREATE UNIQUE INDEX "Product_accountId_barcode_key" ON "Product"("accountId", "barcode");
