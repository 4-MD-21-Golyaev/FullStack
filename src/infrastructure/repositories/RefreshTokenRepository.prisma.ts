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
