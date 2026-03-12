-- Add claimedAt to OutboxEvent for concurrency-safe claim/lock mechanism.
-- A worker atomically sets claimedAt = now() with FOR UPDATE SKIP LOCKED,
-- preventing two workers from processing the same event.
ALTER TABLE "OutboxEvent" ADD COLUMN "claimedAt" TIMESTAMP(3);

CREATE INDEX "OutboxEvent_claimedAt_idx" ON "OutboxEvent"("claimedAt");
