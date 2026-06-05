-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'CASH_AND_CARD';
ALTER TYPE "PaymentMethod" ADD VALUE 'CASH_AND_MOBILE_BANKING';
ALTER TYPE "PaymentMethod" ADD VALUE 'CASH_AND_CREDIT';
ALTER TYPE "PaymentMethod" ADD VALUE 'CARD_AND_MOBILE_BANKING';
ALTER TYPE "PaymentMethod" ADD VALUE 'CARD_AND_CREDIT';
ALTER TYPE "PaymentMethod" ADD VALUE 'MOBILE_BANKING_AND_CREDIT';

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "payments" JSONB;
