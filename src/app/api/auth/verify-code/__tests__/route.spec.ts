import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/application/auth/VerifyCodeUseCase', () => ({
    VerifyCodeUseCase: class { execute = mockExecute; },
}));

vi.mock('@/infrastructure/repositories/OtpRepository.prisma', () => ({ PrismaOtpRepository: class {} }));
vi.mock('@/infrastructure/repositories/UserRepository.prisma', () => ({ PrismaUserRepository: class {} }));
vi.mock('@/infrastructure/repositories/RefreshTokenRepository.prisma', () => ({ PrismaRefreshTokenRepository: class {} }));
vi.mock('@/infrastructure/auth/JoseTokenService', () => ({ JoseTokenService: class {} }));

vi.mock('@/lib/auth/session', () => ({
    setTokenCookies: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { setTokenCookies } from '@/lib/auth/session';
import { InvalidOtpError, UserNotFoundError } from '@/domain/auth/errors';

const mockSetCookies = setTokenCookies as ReturnType<typeof vi.fn>;

function makeReq(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('POST /api/auth/verify-code', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns 400 when email is missing', async () => {
        const res = await POST(makeReq({ code: '123456' }));
        expect(res.status).toBe(400);
    });

    it('returns 400 when code is missing', async () => {
        const res = await POST(makeReq({ email: 'user@example.com' }));
        expect(res.status).toBe(400);
    });

    it('returns 401 for invalid OTP', async () => {
        mockExecute.mockRejectedValue(new InvalidOtpError());
        const res = await POST(makeReq({ email: 'user@example.com', code: '000000' }));
        expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
        mockExecute.mockRejectedValue(new UserNotFoundError('unknown@example.com'));
        const res = await POST(makeReq({ email: 'unknown@example.com', code: '123456' }));
        expect(res.status).toBe(404);
    });

    it('returns 200 and calls setTokenCookies on success', async () => {
        mockExecute.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });

        const res = await POST(makeReq({ email: 'user@example.com', code: '123456' }));
        expect(res.status).toBe(200);
        expect(mockSetCookies).toHaveBeenCalledWith(expect.anything(), 'at', 'rt');
    });
});
