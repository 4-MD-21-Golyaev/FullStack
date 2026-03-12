-- DropIndex
DROP INDEX "Payment_pending_order_unique";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryClaimUserId" TEXT,
ADD COLUMN     "deliveryClaimedAt" TIMESTAMP(3),
ADD COLUMN     "pickerClaimUserId" TEXT,
ADD COLUMN     "pickerClaimedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "correlationId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRunLog" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "initiatedBy" TEXT,
    "processed" INTEGER,
    "failed" INTEGER,
    "errorSummary" TEXT,

    CONSTRAINT "JobRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "JobRunLog_jobName_startedAt_idx" ON "JobRunLog"("jobName", "startedAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickerClaimUserId_fkey" FOREIGN KEY ("pickerClaimUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryClaimUserId_fkey" FOREIGN KEY ("deliveryClaimUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
