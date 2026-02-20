-- AlterTable
ALTER TABLE "Order" ADD COLUMN "absenceResolutionStrategy" TEXT NOT NULL DEFAULT 'CALL_REPLACE';
