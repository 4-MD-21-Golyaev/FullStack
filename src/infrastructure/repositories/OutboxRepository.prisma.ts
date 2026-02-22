import type { PrismaClient, Prisma } from '@prisma/client';
import { OutboxRepository, OutboxEvent } from '@/application/ports/OutboxRepository';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaOutboxRepository implements OutboxRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async save(event: Omit<OutboxEvent, 'createdAt' | 'processedAt' | 'failedAt' | 'errorMessage' | 'retryCount'>): Promise<void> {
        await this.db.outboxEvent.create({ data: event });
    }

    async findPending(maxRetries: number): Promise<OutboxEvent[]> {
        return this.db.outboxEvent.findMany({
            where: {
                processedAt: null,
                failedAt: null,
                retryCount: { lt: maxRetries },
            },
            orderBy: { createdAt: 'asc' },
        });
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
        await this.db.outboxEvent.update({
            where: { id },
            data: { retryCount: { increment: 1 } },
        });
    }
}
