-- AlterTable
ALTER TABLE "CustomerReturn" ADD COLUMN     "excessRefundAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "requiresManualRefund" BOOLEAN NOT NULL DEFAULT false;
