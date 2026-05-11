-- CreateEnum
CREATE TYPE "FeatureName" AS ENUM ('RETAIL', 'SERVICE', 'RESTAURANT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'MOBILE_BANKING', 'CREDIT');

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "productIds" TEXT[],
    "customerId" TEXT,
    "customerNumber" TEXT,
    "quantity" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "serviceId" TEXT,
    "purchasePrice" DECIMAL(65,30) NOT NULL,
    "sellPrice" DECIMAL(65,30) NOT NULL,
    "featureNames" "FeatureName"[],
    "discount" DECIMAL(65,30),
    "due" DECIMAL(65,30),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sale_accountId_idx" ON "Sale"("accountId");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
