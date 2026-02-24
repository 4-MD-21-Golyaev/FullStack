import type { PrismaClient, Prisma } from '@prisma/client';
import { OtpRepository } from '@/application/ports/OtpRepository';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaOtpRepository implements OtpRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async create(email: string, code: string, expiresAt: Date): Promise<void> {
        await this.db.emailOtp.create({
            data: { email, code, expiresAt },
        });
    }

    async verify(email: string, code: string): Promise<boolean> {
        const otp = await this.db.emailOtp.findFirst({
            where: {
                email,
                code,
                used: false,
                expiresAt: { gt: new Date() },
            },
        });

        if (!otp) return false;

        await this.db.emailOtp.update({
            where: { id: otp.id },
            data: { used: true },
        });

        return true;
    }
}
