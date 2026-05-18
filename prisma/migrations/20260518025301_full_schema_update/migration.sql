/*
  Warnings:

  - The values [INVENTORY,WASTE,TRASH,ACTIVITY_LOG] on the enum `SystemModule` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `serviceId` on the `Sale` table. All the data in the column will be lost.
  - Made the column `accountId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccountModel" ADD VALUE 'RETAIL_AND_SERVICE';
ALTER TYPE "AccountModel" ADD VALUE 'SERVICE_AND_RESTAURANT';
ALTER TYPE "AccountModel" ADD VALUE 'RETAIL_AND_RESTAURANT';
ALTER TYPE "AccountModel" ADD VALUE 'RETAIL_AND_SERVICE_AND_RESTAURANT';

-- AlterEnum
BEGIN;
CREATE TYPE "SystemModule_new" AS ENUM ('AUTH', 'USER', 'ACCOUNT', 'CATEGORY', 'SUBCATEGORY', 'SUPPLIER', 'PRODUCT', 'RAW_PRODUCT', 'PREPARED_PRODUCT', 'PURCHASE', 'SERVICE', 'CUSTOMER', 'SALE', 'WASTAGE', 'INVOICE', 'PERMISSION', 'PRICING_PLAN', 'NOTIFICATION');
ALTER TABLE "Permission" ALTER COLUMN "module" TYPE "SystemModule_new" USING ("module"::text::"SystemModule_new");
ALTER TABLE "PricingPlan" ALTER COLUMN "allowedModules" TYPE "SystemModule_new"[] USING ("allowedModules"::text::"SystemModule_new"[]);
ALTER TABLE "Trash" ALTER COLUMN "moduleName" TYPE "SystemModule_new" USING ("moduleName"::text::"SystemModule_new");
ALTER TABLE "ActivityLog" ALTER COLUMN "module" TYPE "SystemModule_new" USING ("module"::text::"SystemModule_new");
ALTER TYPE "SystemModule" RENAME TO "SystemModule_old";
ALTER TYPE "SystemModule_new" RENAME TO "SystemModule";
DROP TYPE "public"."SystemModule_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_accountId_fkey";

-- DropIndex
DROP INDEX "Permission_userId_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "features" "FeatureName"[];

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "serviceId";

-- AlterTable
ALTER TABLE "SubCategory" ADD COLUMN     "features" "FeatureName"[];

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "accountId" SET NOT NULL;

-- CreateTable
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "pricingPlanId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "email" TEXT,
    "companyName" TEXT,
    "address" TEXT,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "img" TEXT,
    "description" TEXT,
    "sku" TEXT,
    "tax" DECIMAL(65,30),
    "defaultPurchasePrice" DECIMAL(65,30),
    "defaultSalePrice" DECIMAL(65,30),
    "lowStockAlert" TEXT,
    "categoryId" TEXT NOT NULL,
    "subCategoryId" TEXT,
    "accountId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "supplierId" TEXT,
    "quantity" INTEGER NOT NULL,
    "purchasePrice" DECIMAL(65,30) NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "batch" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "totalStock" TEXT NOT NULL,
    "img" TEXT,
    "description" TEXT,
    "lowStockAlert" TEXT,
    "categoryId" TEXT NOT NULL,
    "subCategoryId" TEXT,
    "accountId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawProductStock" (
    "id" TEXT NOT NULL,
    "rawProductId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "supplierId" TEXT,
    "quantity" INTEGER NOT NULL,
    "totalCost" DECIMAL(65,30),
    "lowStockAlert" TEXT,
    "batch" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawProductStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparedProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "none" TEXT,
    "img" TEXT,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "subCategoryId" TEXT,
    "rawMaterialCost" DECIMAL(65,30),
    "expiryDate" TIMESTAMP(3),
    "defaultSalePrice" DECIMAL(65,30),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreparedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparedProductItem" (
    "id" TEXT NOT NULL,
    "preparedProductId" TEXT NOT NULL,
    "rawProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "PreparedProductItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparedProductStock" (
    "id" TEXT NOT NULL,
    "preparedProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreparedProductStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "qty" INTEGER NOT NULL,
    "purchasePrice" DECIMAL(65,30) NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "supplierId" TEXT,
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "internalCost" DECIMAL(65,30) DEFAULT 0,
    "salePrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "subCategoryId" TEXT,
    "accountId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleService" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "SaleService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wastage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wastage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionHistory_accountId_idx" ON "SubscriptionHistory"("accountId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_pricingPlanId_idx" ON "SubscriptionHistory"("pricingPlanId");

-- CreateIndex
CREATE INDEX "Supplier_accountId_idx" ON "Supplier"("accountId");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_categoryId_idx" ON "Supplier"("categoryId");

-- CreateIndex
CREATE INDEX "Product_accountId_idx" ON "Product"("accountId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "ProductStock_accountId_idx" ON "ProductStock"("accountId");

-- CreateIndex
CREATE INDEX "ProductStock_productId_idx" ON "ProductStock"("productId");

-- CreateIndex
CREATE INDEX "ProductStock_supplierId_idx" ON "ProductStock"("supplierId");

-- CreateIndex
CREATE INDEX "RawProduct_accountId_idx" ON "RawProduct"("accountId");

-- CreateIndex
CREATE INDEX "RawProduct_categoryId_idx" ON "RawProduct"("categoryId");

-- CreateIndex
CREATE INDEX "RawProduct_name_idx" ON "RawProduct"("name");

-- CreateIndex
CREATE INDEX "RawProductStock_accountId_idx" ON "RawProductStock"("accountId");

-- CreateIndex
CREATE INDEX "RawProductStock_rawProductId_idx" ON "RawProductStock"("rawProductId");

-- CreateIndex
CREATE INDEX "RawProductStock_supplierId_idx" ON "RawProductStock"("supplierId");

-- CreateIndex
CREATE INDEX "PreparedProduct_accountId_idx" ON "PreparedProduct"("accountId");

-- CreateIndex
CREATE INDEX "PreparedProduct_name_idx" ON "PreparedProduct"("name");

-- CreateIndex
CREATE INDEX "PreparedProductItem_preparedProductId_idx" ON "PreparedProductItem"("preparedProductId");

-- CreateIndex
CREATE INDEX "PreparedProductItem_rawProductId_idx" ON "PreparedProductItem"("rawProductId");

-- CreateIndex
CREATE UNIQUE INDEX "PreparedProductItem_preparedProductId_rawProductId_key" ON "PreparedProductItem"("preparedProductId", "rawProductId");

-- CreateIndex
CREATE INDEX "PreparedProductStock_accountId_idx" ON "PreparedProductStock"("accountId");

-- CreateIndex
CREATE INDEX "PreparedProductStock_preparedProductId_idx" ON "PreparedProductStock"("preparedProductId");

-- CreateIndex
CREATE INDEX "Purchase_accountId_idx" ON "Purchase"("accountId");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_idx" ON "Purchase"("supplierId");

-- CreateIndex
CREATE INDEX "Purchase_createdAt_idx" ON "Purchase"("createdAt");

-- CreateIndex
CREATE INDEX "Service_accountId_idx" ON "Service"("accountId");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE INDEX "Service_name_idx" ON "Service"("name");

-- CreateIndex
CREATE INDEX "SaleService_accountId_idx" ON "SaleService"("accountId");

-- CreateIndex
CREATE INDEX "SaleService_saleId_idx" ON "SaleService"("saleId");

-- CreateIndex
CREATE INDEX "SaleService_serviceId_idx" ON "SaleService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleService_saleId_serviceId_key" ON "SaleService"("saleId", "serviceId");

-- CreateIndex
CREATE INDEX "Wastage_accountId_idx" ON "Wastage"("accountId");

-- CreateIndex
CREATE INDEX "Wastage_productId_idx" ON "Wastage"("productId");

-- CreateIndex
CREATE INDEX "Notification_accountId_idx" ON "Notification"("accountId");

-- CreateIndex
CREATE INDEX "Account_status_idx" ON "Account"("status");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_pricingPlanId_fkey" FOREIGN KEY ("pricingPlanId") REFERENCES "PricingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStock" ADD CONSTRAINT "ProductStock_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProduct" ADD CONSTRAINT "RawProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProduct" ADD CONSTRAINT "RawProduct_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProduct" ADD CONSTRAINT "RawProduct_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProductStock" ADD CONSTRAINT "RawProductStock_rawProductId_fkey" FOREIGN KEY ("rawProductId") REFERENCES "RawProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProductStock" ADD CONSTRAINT "RawProductStock_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProductStock" ADD CONSTRAINT "RawProductStock_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawProductStock" ADD CONSTRAINT "RawProductStock_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparedProduct" ADD CONSTRAINT "PreparedProduct_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparedProductItem" ADD CONSTRAINT "PreparedProductItem_preparedProductId_fkey" FOREIGN KEY ("preparedProductId") REFERENCES "PreparedProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparedProductItem" ADD CONSTRAINT "PreparedProductItem_rawProductId_fkey" FOREIGN KEY ("rawProductId") REFERENCES "RawProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparedProductStock" ADD CONSTRAINT "PreparedProductStock_preparedProductId_fkey" FOREIGN KEY ("preparedProductId") REFERENCES "PreparedProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparedProductStock" ADD CONSTRAINT "PreparedProductStock_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleService" ADD CONSTRAINT "SaleService_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleService" ADD CONSTRAINT "SaleService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleService" ADD CONSTRAINT "SaleService_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wastage" ADD CONSTRAINT "Wastage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trash" ADD CONSTRAINT "Trash_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
