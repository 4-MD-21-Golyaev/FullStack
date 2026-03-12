import type { PrismaClient, Prisma } from '@prisma/client';
import { OtpRepository } from '@/application/ports/OtpRepository';
import { OtpRateLimitedError } from '@/domain/auth/errors';
import { hashOtpCode, compareOtpHashes } from '@/lib/auth/otp-hash';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

const MAX_ATTEMPTS = 5;

export class PrismaOtpRepository implements OtpRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async create(email: string, code: string, expiresAt: Date): Promise<void> {
        const hashedCode = hashOtpCode(code, email);
        await this.db.emailOtp.create({
            data: { email, code: hashedCode, expiresAt },
        });
    }

    async verify(email: string, code: string): Promise<boolean> {
        const now = new Date();

        // Find the most recently created active OTP for this email
        const otp = await this.db.emailOtp.findFirst({
            where: {
                email,
                used: false,
                expiresAt: { gt: now },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!otp) return false;

        // Brute-force protection: reject further attempts once limit is reached
        if (otp.attemptCount >= MAX_ATTEMPTS) {
            throw new OtpRateLimitedError();
        }

        const expectedHash = hashOtpCode(code, email);
        const valid = compareOtpHashes(expectedHash, otp.code);

        if (!valid) {
            await this.db.emailOtp.update({
                where: { id: otp.id },
                data: { attemptCount: { increment: 1 } },
            });
            return false;
        }

        // Mark this OTP as used
        await this.db.emailOtp.update({
            where: { id: otp.id },
            data: { used: true },
        });

        // Invalidate all other active OTPs for this email (single-use per session)
        await this.db.emailOtp.updateMany({
            where: { email, used: false, id: { not: otp.id } },
            data: { used: true },
        });

        return true;
    }
}
