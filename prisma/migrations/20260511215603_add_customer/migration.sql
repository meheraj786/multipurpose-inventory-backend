-- CreateEnum
CREATE TYPE "SystemModule" AS ENUM ('AUTH', 'USER', 'CATEGORY', 'SUBCATEGORY', 'PRODUCT', 'SUPPLIER', 'CUSTOMER', 'SALE', 'PURCHASE', 'INVENTORY', 'WASTE', 'TRASH', 'ACTIVITY_LOG');

-- CreateEnum
CREATE TYPE "SystemAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT', 'STOCK_IN', 'STOCK_OUT');

-- CreateTable
CREATE TABLE "Trash" (
    "id" TEXT NOT NULL,
    "moduleName" "SystemModule" NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "deletedBy" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" "SystemModule" NOT NULL,
    "action" "SystemAction" NOT NULL,
    "details" TEXT,
    "accountId" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "hasMembership" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trash_accountId_idx" ON "Trash"("accountId");

-- CreateIndex
CREATE INDEX "ActivityLog_accountId_idx" ON "ActivityLog"("accountId");

-- CreateIndex
CREATE INDEX "Customer_accountId_idx" ON "Customer"("accountId");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
