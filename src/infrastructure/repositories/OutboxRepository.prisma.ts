import type { PrismaClient, Prisma } from '@prisma/client';
import { OutboxRepository, OutboxEvent } from '@/application/ports/OutboxRepository';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

const CLAIM_BATCH_SIZE = 50;

export class PrismaOutboxRepository implements OutboxRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async save(event: Omit<OutboxEvent, 'createdAt' | 'processedAt' | 'failedAt' | 'errorMessage' | 'retryCount' | 'claimedAt'>): Promise<void> {
        await this.db.outboxEvent.create({ data: { ...event, payload: event.payload as Prisma.InputJsonValue } });
    }

    async claimPending(maxRetries: number, now: Date, staleAfter: Date): Promise<OutboxEvent[]> {
        // Release stale claims so events don't get stuck if a worker crashed mid-process.
        await this.db.$executeRaw`
            UPDATE "OutboxEvent"
            SET "claimedAt" = NULL
            WHERE "claimedAt" < ${staleAfter}
              AND "processedAt" IS NULL
              AND "failedAt" IS NULL
        `;

        // Atomically claim a batch: FOR UPDATE SKIP LOCKED prevents two workers
        // from claiming the same event.
        const rows: any[] = await this.db.$queryRaw`
            UPDATE "OutboxEvent"
            SET "claimedAt" = ${now}
            WHERE id IN (
                SELECT id FROM "OutboxEvent"
                WHERE "claimedAt" IS NULL
                  AND "processedAt" IS NULL
                  AND "failedAt" IS NULL
                  AND "retryCount" < ${maxRetries}
                ORDER BY "createdAt" ASC
                LIMIT ${CLAIM_BATCH_SIZE}
                FOR UPDATE SKIP LOCKED
            )
            RETURNING *
        `;

        return rows.map(r => ({
            id: r.id,
            eventType: r.eventType,
            payload: r.payload,
            createdAt: r.createdAt,
            processedAt: r.processedAt,
            failedAt: r.failedAt,
            errorMessage: r.errorMessage,
            retryCount: r.retryCount,
            claimedAt: r.claimedAt,
        }));
    }

    async markProcessed(id: string): Promise<void> {
        await this.db.outboxEvent.update({
            where: { id },
            data: { processedAt: new Date() },
        });
    }

    async markFailed(id: string, errorMessage: string): Promise<void> {
        await this.db.outboxEvent.update({
            where: { id },
            data: { failedAt: new Date(), errorMessage },
        });
    }

    async incrementRetry(id: string): Promise<void> {
        // Reset claimedAt so the event becomes available for re-claim on the next run.
        await this.db.outboxEvent.update({
            where: { id },
            data: { retryCount: { increment: 1 }, claimedAt: null },
        });
    }
}
