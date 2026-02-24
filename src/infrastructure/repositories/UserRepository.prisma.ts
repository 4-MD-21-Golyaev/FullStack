import type { PrismaClient, Prisma } from '@prisma/client';
import { UserRepository, UserInfo, CreateUserData } from '@/application/ports/UserRepository';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaUserRepository implements UserRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async findByEmail(email: string): Promise<UserInfo | null> {
        const record = await this.db.user.findUnique({ where: { email } });
        if (!record) return null;
        return this.toUserInfo(record);
    }

    async findById(id: string): Promise<UserInfo | null> {
        const record = await this.db.user.findUnique({ where: { id } });
        if (!record) return null;
        return this.toUserInfo(record);
    }

    async create(data: CreateUserData): Promise<UserInfo> {
        const record = await this.db.user.create({
            data: {
                email: data.email,
                phone: data.phone,
                address: data.address ?? null,
                role: data.role,
            },
        });
        return this.toUserInfo(record);
    }

    private toUserInfo(record: { id: string; email: string; role: string; phone: string; address: string | null }): UserInfo {
        return {
            id: record.id,
            email: record.email,
            role: record.role,
            phone: record.phone,
            address: record.address,
        };
    }
}
