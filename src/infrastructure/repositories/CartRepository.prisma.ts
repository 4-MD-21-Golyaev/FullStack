import type { PrismaClient, Prisma } from '@prisma/client';
import { CartRepository } from '@/application/ports/CartRepository';
import { CartItem } from '@/domain/cart/CartItem';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaCartRepository implements CartRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async findByUserId(userId: string): Promise<CartItem[]> {
        const records = await this.db.cartItem.findMany({ where: { userId } });
        return records.map(r => ({ userId: r.userId, productId: r.productId, quantity: r.quantity }));
    }

    async findByUserAndProduct(userId: string, productId: string): Promise<CartItem | null> {
        const record = await this.db.cartItem.findUnique({
            where: { userId_productId: { userId, productId } },
        });
        if (!record) return null;
        return { userId: record.userId, productId: record.productId, quantity: record.quantity };
    }

    async save(item: CartItem): Promise<void> {
        await this.db.cartItem.upsert({
            where: { userId_productId: { userId: item.userId, productId: item.productId } },
            update: { quantity: item.quantity },
            create: { userId: item.userId, productId: item.productId, quantity: item.quantity },
        });
    }

    async remove(userId: string, productId: string): Promise<void> {
        await this.db.cartItem.deleteMany({ where: { userId, productId } });
    }

    async clear(userId: string): Promise<void> {
        await this.db.cartItem.deleteMany({ where: { userId } });
    }
}
