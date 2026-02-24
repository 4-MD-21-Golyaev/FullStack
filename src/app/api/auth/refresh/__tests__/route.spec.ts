import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/application/auth/RefreshUseCase', () => ({
    RefreshUseCase: class { execute = mockExecute; },
}));

vi.mock('@/infrastructure/repositories/RefreshTokenRepository.prisma', () => ({ PrismaRefreshTokenRepository: class {} }));
vi.mock('@/infrastructure/repositories/UserRepository.prisma', () => ({ PrismaUserRepository: class {} }));
vi.mock('@/infrastructure/auth/JoseTokenService', () => ({ JoseTokenService: class {} }));

vi.mock('@/lib/auth/session', () => ({
    getRefreshToken: vi.fn(),
    setTokenCookies: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getRefreshToken, setTokenCookies } from '@/lib/auth/session';
import { InvalidRefreshTokenError } from '@/domain/auth/errors';

const mockGetRefreshToken = getRefreshToken as ReturnType<typeof vi.fn>;
const mockSetCookies = setTokenCookies as ReturnType<typeof vi.fn>;

function makeReq(): NextRequest {
    return new NextRequest('http://localhost/api/auth/refresh', { method: 'POST' });
}

describe('POST /api/auth/refresh', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns 401 when no refresh token cookie', async () => {
        mockGetRefreshToken.mockReturnValue(null);

        const res = await POST(makeReq());
        expect(res.status).toBe(401);
    });

    it('returns 401 when refresh token is invalid', async () => {
        mockGetRefreshToken.mockReturnValue('bad-token');
        mockExecute.mockRejectedValue(new InvalidRefreshTokenError());

        const res = await POST(makeReq());
        expect(res.status).toBe(401);
    });

    it('returns 200 and sets new cookies on success', async () => {
        mockGetRefreshToken.mockReturnValue('valid-token');
        mockExecute.mockResolvedValue({ accessToken: 'new-at', refreshToken: 'new-rt' });

        const res = await POST(makeReq());
        expect(res.status).toBe(200);
        expect(mockSetCookies).toHaveBeenCalledWith(expect.anything(), 'new-at', 'new-rt');
    });
});
