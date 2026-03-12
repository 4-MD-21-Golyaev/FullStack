import type { PrismaClient, Prisma } from '@prisma/client';
import { RefreshTokenRepository, RefreshTokenRecord } from '@/application/ports/RefreshTokenRepository';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async save(token: RefreshTokenRecord): Promise<void> {
        await this.db.refreshToken.create({
            data: {
                id: token.id,
                userId: token.userId,
                revoked: token.revoked,
                expiresAt: token.expiresAt,
                createdAt: token.createdAt,
            },
        });
    }

    async findById(id: string): Promise<RefreshTokenRecord | null> {
        const record = await this.db.refreshToken.findUnique({ where: { id } });
        if (!record) return null;
        return {
            id: record.id,
            userId: record.userId,
            revoked: record.revoked,
            expiresAt: record.expiresAt,
            createdAt: record.createdAt,
        };
    }

    async consumeActive(id: string, now: Date): Promise<RefreshTokenRecord | null> {
        // Atomic compare-and-swap: only revokes if currently active.
        // If two requests arrive simultaneously, only the one that wins the UPDATE
        // gets count=1; the other gets count=0 and receives null → 401.
        const result = await this.db.refreshToken.updateMany({
            where: { id, revoked: false, expiresAt: { gt: now } },
            data: { revoked: true },
        });

        if (result.count === 0) return null;

        // Safe to read back: we own this token (it's already revoked for others).
        const record = await this.db.refreshToken.findUnique({ where: { id } });
        if (!record) return null;

        return {
            id: record.id,
            userId: record.userId,
            revoked: record.revoked,
            expiresAt: record.expiresAt,
            createdAt: record.createdAt,
        };
    }

    async revoke(id: string): Promise<void> {
        await this.db.refreshToken.update({
            where: { id },
            data: { revoked: true },
        });
    }

    async revokeAllForUser(userId: string): Promise<void> {
        await this.db.refreshToken.updateMany({
            where: { userId, revoked: false },
            data: { revoked: true },
        });
    }
}
