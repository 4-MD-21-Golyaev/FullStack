import { randomInt } from 'crypto';
import { prisma } from '@/infrastructure/db/prismaClient';

export function generateOtp(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function createOtpInDB(email: string): Promise<string> {
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.emailOtp.create({
        data: { email, code, expiresAt },
    });

    return code;
}

export async function verifyOtpInDB(email: string, code: string): Promise<boolean> {
    const otp = await prisma.emailOtp.findFirst({
        where: {
            email,
            code,
            used: false,
            expiresAt: { gt: new Date() },
        },
    });

    if (!otp) return false;

    await prisma.emailOtp.update({
        where: { id: otp.id },
        data: { used: true },
    });

    return true;
}
