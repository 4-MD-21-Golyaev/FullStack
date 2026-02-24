import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/application/auth/LogoutUseCase', () => ({
    LogoutUseCase: class { execute = mockExecute; },
}));

vi.mock('@/infrastructure/repositories/RefreshTokenRepository.prisma', () => ({ PrismaRefreshTokenRepository: class {} }));
vi.mock('@/infrastructure/auth/JoseTokenService', () => ({ JoseTokenService: class {} }));

vi.mock('@/lib/auth/session', () => ({
    getRefreshToken: vi.fn(),
    clearTokenCookies: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getRefreshToken, clearTokenCookies } from '@/lib/auth/session';

const mockGetRefreshToken = getRefreshToken as ReturnType<typeof vi.fn>;
const mockClearCookies = clearTokenCookies as ReturnType<typeof vi.fn>;

function makeReq(): NextRequest {
    return new NextRequest('http://localhost/api/auth/logout', { method: 'POST' });
}

describe('POST /api/auth/logout', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns 200 and clears cookies even without refresh token', async () => {
        mockGetRefreshToken.mockReturnValue(null);

        const res = await POST(makeReq());
        expect(res.status).toBe(200);
        expect(mockClearCookies).toHaveBeenCalledOnce();
        expect(mockExecute).not.toHaveBeenCalled();
    });

    it('returns 200 and calls logout use case when refresh token present', async () => {
        mockGetRefreshToken.mockReturnValue('rt-value');
        mockExecute.mockResolvedValue(undefined);

        const res = await POST(makeReq());
        expect(res.status).toBe(200);
        expect(mockExecute).toHaveBeenCalledWith({ refreshToken: 'rt-value' });
        expect(mockClearCookies).toHaveBeenCalledOnce();
    });
});
