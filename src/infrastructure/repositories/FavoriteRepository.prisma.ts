import type { PrismaClient, Prisma } from '@prisma/client';
import { type FavoriteRepository } from '@/application/ports/FavoriteRepository';
import { type FavoriteItem } from '@/domain/favorites/FavoriteItem';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaFavoriteRepository implements FavoriteRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async findByUserId(userId: string): Promise<FavoriteItem[]> {
        const records = await this.db.favorite.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return records.map(r => ({
            userId: r.userId,
            productId: r.productId,
            createdAt: r.createdAt,
        }));
    }

    async findByUserAndProduct(userId: string, productId: string): Promise<FavoriteItem | null> {
        const record = await this.db.favorite.findUnique({
            where: { userId_productId: { userId, productId } },
        });
        if (!record) return null;
        return { userId: record.userId, productId: record.productId, createdAt: record.createdAt };
    }

    async save(item: FavoriteItem): Promise<void> {
        await this.db.favorite.upsert({
            where: { userId_productId: { userId: item.userId, productId: item.productId } },
            update: {},
            create: {
                userId: item.userId,
                productId: item.productId,
                createdAt: item.createdAt,
            },
        });
    }

    async remove(userId: string, productId: string): Promise<void> {
        await this.db.favorite.deleteMany({ where: { userId, productId } });
    }
}
