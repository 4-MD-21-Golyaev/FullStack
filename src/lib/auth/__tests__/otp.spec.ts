import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/infrastructure/db/prismaClient', () => ({
    prisma: {
        emailOtp: {
            findFirst: vi.fn(),
            update: vi.fn(),
            create: vi.fn(),
        },
    },
}));

import { PrismaOtpRepository } from '@/infrastructure/repositories/OtpRepository.prisma';
import { prisma } from '@/infrastructure/db/prismaClient';

const mockEmailOtp = prisma.emailOtp as {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
};

describe('PrismaOtpRepository', () => {
    let repo: PrismaOtpRepository;

    beforeEach(() => {
        vi.resetAllMocks();
        repo = new PrismaOtpRepository();
    });

    it('creates OTP record', async () => {
        const expiresAt = new Date(Date.now() + 600000);
        await repo.create('a@b.com', '123456', expiresAt);

        expect(mockEmailOtp.create).toHaveBeenCalledWith({
            data: { email: 'a@b.com', code: '123456', expiresAt },
        });
    });

    it('returns true and marks otp used when valid code found', async () => {
        const fakeOtp = {
            id: 'otp-1',
            email: 'a@b.com',
            code: '123456',
            used: false,
            expiresAt: new Date(Date.now() + 60000),
        };
        mockEmailOtp.findFirst.mockResolvedValue(fakeOtp);
        mockEmailOtp.update.mockResolvedValue({ ...fakeOtp, used: true });

        const result = await repo.verify('a@b.com', '123456');

        expect(result).toBe(true);
        expect(mockEmailOtp.update).toHaveBeenCalledWith({
            where: { id: 'otp-1' },
            data: { used: true },
        });
    });

    it('returns false when no otp found', async () => {
        mockEmailOtp.findFirst.mockResolvedValue(null);

        const result = await repo.verify('a@b.com', '999999');

        expect(result).toBe(false);
        expect(mockEmailOtp.update).not.toHaveBeenCalled();
    });
});
