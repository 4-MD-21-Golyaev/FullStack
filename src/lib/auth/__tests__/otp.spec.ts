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

import { generateOtp, verifyOtpInDB } from '../otp';
import { prisma } from '@/infrastructure/db/prismaClient';

const mockEmailOtp = prisma.emailOtp as {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
};

describe('generateOtp', () => {
    it('returns a 6-digit string', () => {
        for (let i = 0; i < 20; i++) {
            const otp = generateOtp();
            expect(otp).toMatch(/^\d{6}$/);
        }
    });
});

describe('verifyOtpInDB', () => {
    beforeEach(() => {
        vi.resetAllMocks();
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

        const result = await verifyOtpInDB('a@b.com', '123456');

        expect(result).toBe(true);
        expect(mockEmailOtp.update).toHaveBeenCalledWith({
            where: { id: 'otp-1' },
            data: { used: true },
        });
    });

    it('returns false when no otp found', async () => {
        mockEmailOtp.findFirst.mockResolvedValue(null);

        const result = await verifyOtpInDB('a@b.com', '999999');

        expect(result).toBe(false);
        expect(mockEmailOtp.update).not.toHaveBeenCalled();
    });

    it('returns false when otp is already used (findFirst returns null due to used=false filter)', async () => {
        // Prisma query includes used:false so already-used OTPs aren't returned
        mockEmailOtp.findFirst.mockResolvedValue(null);

        const result = await verifyOtpInDB('a@b.com', '123456');

        expect(result).toBe(false);
        expect(mockEmailOtp.update).not.toHaveBeenCalled();
    });
});
