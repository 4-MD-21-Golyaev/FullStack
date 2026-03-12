import type { PrismaClient, Prisma } from '@prisma/client';
import { AuditLogRepository } from '@/application/ports/AuditLogRepository';
import { AuditLog } from '@/domain/audit/AuditLog';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaAuditLogRepository implements AuditLogRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async save(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
        await this.db.auditLog.create({
            data: {
                actorUserId: entry.actorUserId,
                actorRole: entry.actorRole,
                action: entry.action,
                targetType: entry.targetType,
                targetId: entry.targetId,
                before: entry.before !== undefined ? (entry.before as Prisma.InputJsonValue) : undefined,
                after: entry.after !== undefined ? (entry.after as Prisma.InputJsonValue) : undefined,
                reason: entry.reason,
                correlationId: entry.correlationId,
            },
        });
    }
}
