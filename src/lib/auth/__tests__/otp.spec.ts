import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

vi.mock('@/infrastructure/db/prismaClient', () => ({
    prisma: {
        emailOtp: {
            findFirst: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
            create: vi.fn(),
        },
    },
}));

import { PrismaOtpRepository } from '@/infrastructure/repositories/OtpRepository.prisma';
import { prisma } from '@/infrastructure/db/prismaClient';
import { OtpRateLimitedError } from '@/domain/auth/errors';

const mockEmailOtp = prisma.emailOtp as unknown as {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
};

const TEST_SECRET = 'test-otp-secret';
const TEST_EMAIL = 'a@b.com';
const TEST_CODE = '123456';

function computeHash(code: string, email: string): string {
    return createHmac('sha256', TEST_SECRET).update(`${email.toLowerCase()}:${code}`).digest('hex');
}

function makeOtp(overrides: Record<string, unknown> = {}) {
    return {
        id: 'otp-1',
        email: TEST_EMAIL,
        code: computeHash(TEST_CODE, TEST_EMAIL),
        used: false,
        expiresAt: new Date(Date.now() + 600000),
        attemptCount: 0,
        ...overrides,
    };
}

describe('PrismaOtpRepository', () => {
    let repo: PrismaOtpRepository;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubEnv('OTP_HMAC_SECRET', TEST_SECRET);
        repo = new PrismaOtpRepository();
    });

    describe('create', () => {
        it('stores HMAC hash of the code, not plaintext', async () => {
            const expiresAt = new Date(Date.now() + 600000);
            await repo.create(TEST_EMAIL, TEST_CODE, expiresAt);

            const callArgs = mockEmailOtp.create.mock.calls[0][0].data;
            expect(callArgs.code).not.toBe(TEST_CODE);
            expect(callArgs.code).toBe(computeHash(TEST_CODE, TEST_EMAIL));
            expect(callArgs.email).toBe(TEST_EMAIL);
            expect(callArgs.expiresAt).toBe(expiresAt);
        });
    });

    describe('verify', () => {
        it('returns true when code matches, marks OTP used, invalidates others', async () => {
            mockEmailOtp.findFirst.mockResolvedValue(makeOtp());
            mockEmailOtp.update.mockResolvedValue(undefined);
            mockEmailOtp.updateMany.mockResolvedValue({ count: 0 });

            const result = await repo.verify(TEST_EMAIL, TEST_CODE);

            expect(result).toBe(true);
            expect(mockEmailOtp.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { used: true } })
            );
            expect(mockEmailOtp.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ email: TEST_EMAIL, used: false }),
                    data: { used: true },
                })
            );
        });

        it('returns false when no active OTP found', async () => {
            mockEmailOtp.findFirst.mockResolvedValue(null);

            const result = await repo.verify(TEST_EMAIL, '000000');

            expect(result).toBe(false);
            expect(mockEmailOtp.update).not.toHaveBeenCalled();
        });

        it('returns false and increments attemptCount when code is wrong', async () => {
            mockEmailOtp.findFirst.mockResolvedValue(makeOtp());
            mockEmailOtp.update.mockResolvedValue(undefined);

            const result = await repo.verify(TEST_EMAIL, '000000');

            expect(result).toBe(false);
            expect(mockEmailOtp.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { attemptCount: { increment: 1 } } })
            );
        });

        it('throws OtpRateLimitedError when max attempts exceeded', async () => {
            mockEmailOtp.findFirst.mockResolvedValue(makeOtp({ attemptCount: 5 }));

            await expect(repo.verify(TEST_EMAIL, TEST_CODE))
                .rejects.toBeInstanceOf(OtpRateLimitedError);

            expect(mockEmailOtp.update).not.toHaveBeenCalled();
        });
    });
});
