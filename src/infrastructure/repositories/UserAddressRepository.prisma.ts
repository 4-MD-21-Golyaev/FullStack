import type { PrismaClient, Prisma } from '@prisma/client';
import { type UserAddressRepository } from '@/application/ports/UserAddressRepository';
import { type UserAddress } from '@/domain/user/UserAddress';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaUserAddressRepository implements UserAddressRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async findByUserId(userId: string): Promise<UserAddress[]> {
        const records = await this.db.userAddress.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return records.map(r => ({
            id: r.id,
            userId: r.userId,
            address: r.address,
            createdAt: r.createdAt,
        }));
    }

    async save(address: UserAddress): Promise<void> {
        await this.db.userAddress.create({
            data: {
                id: address.id,
                userId: address.userId,
                address: address.address,
                createdAt: address.createdAt,
            },
        });
    }

    async delete(id: string, _userId: string): Promise<void> {
        await this.db.userAddress.delete({ where: { id } });
    }

    async findById(id: string): Promise<UserAddress | null> {
        const record = await this.db.userAddress.findUnique({ where: { id } });
        if (!record) return null;
        return {
            id: record.id,
            userId: record.userId,
            address: record.address,
            createdAt: record.createdAt,
        };
    }
}
