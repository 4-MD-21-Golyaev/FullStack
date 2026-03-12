-- Add pendingOrderLock column: set to orderId when status=PENDING, NULL otherwise.
-- The unique partial index enforces "at most one PENDING payment per order" at DB level.
ALTER TABLE "Payment" ADD COLUMN "pendingOrderLock" TEXT;

CREATE UNIQUE INDEX "Payment_pending_order_unique"
    ON "Payment"("pendingOrderLock")
    WHERE "pendingOrderLock" IS NOT NULL;
