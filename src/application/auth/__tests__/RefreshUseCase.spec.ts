import { describe, it, expect, vi } from 'vitest';
import { RefreshUseCase } from '../RefreshUseCase';
import { RefreshTokenRepository } from '@/application/ports/RefreshTokenRepository';
import { UserRepository } from '@/application/ports/UserRepository';
import { TokenService } from '@/application/ports/TokenService';
import { InvalidRefreshTokenError } from '@/domain/auth/errors';

const mockUser = { id: 'u1', email: 'a@b.com', role: 'CUSTOMER', phone: '+7', address: null };

const validRecord = {
    id: 'jti-1',
    userId: 'u1',
    revoked: true, // already revoked by consumeActive
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
};

function makeRefreshTokenRepo(consumed: unknown = validRecord): RefreshTokenRepository {
    return {
        save: vi.fn(),
        findById: vi.fn(),
        consumeActive: vi.fn().mockResolvedValue(consumed),
        revoke: vi.fn(),
        revokeAllForUser: vi.fn(),
    };
}

function makeUserRepo(user: unknown = mockUser): UserRepository {
    return { findByEmail: vi.fn(), findById: vi.fn().mockResolvedValue(user), create: vi.fn() };
}

function makeTokenService(payload: unknown = { sub: 'u1', jti: 'jti-1' }): TokenService {
    return {
        signAccessToken: vi.fn().mockResolvedValue('new-access'),
        signRefreshToken: vi.fn().mockResolvedValue('new-refresh'),
        verifyAccessToken: vi.fn(),
        verifyRefreshToken: vi.fn().mockResolvedValue(payload),
    };
}

describe('RefreshUseCase', () => {
    it('throws when refresh token JWT is invalid', async () => {
        const uc = new RefreshUseCase(makeRefreshTokenRepo(), makeUserRepo(), makeTokenService(null));

        await expect(uc.execute({ refreshToken: 'bad' }))
            .rejects.toThrow(InvalidRefreshTokenError);
    });

    it('throws when consumeActive returns null (token not found or expired)', async () => {
        const uc = new RefreshUseCase(makeRefreshTokenRepo(null), makeUserRepo(), makeTokenService());

        await expect(uc.execute({ refreshToken: 'tok' }))
            .rejects.toThrow(InvalidRefreshTokenError);
    });

    it('throws when consumeActive returns null (token already revoked — replay attack)', async () => {
        // Simulates second of two concurrent refresh requests: consumeActive returns null
        const rtRepo = makeRefreshTokenRepo(null);
        const uc = new RefreshUseCase(rtRepo, makeUserRepo(), makeTokenService());

        await expect(uc.execute({ refreshToken: 'tok' }))
            .rejects.toThrow(InvalidRefreshTokenError);

        expect(rtRepo.consumeActive).toHaveBeenCalledOnce();
        expect(rtRepo.save).not.toHaveBeenCalled();
    });

    it('issues new token pair when consumeActive succeeds', async () => {
        const rtRepo = makeRefreshTokenRepo();
        const tokenSvc = makeTokenService();
        const uc = new RefreshUseCase(rtRepo, makeUserRepo(), tokenSvc);

        const result = await uc.execute({ refreshToken: 'tok' });

        expect(result.accessToken).toBe('new-access');
        expect(result.refreshToken).toBe('new-refresh');
        // consumeActive handles revocation; legacy revoke should NOT be called
        expect(rtRepo.revoke).not.toHaveBeenCalled();
        expect(rtRepo.save).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'u1',
            revoked: false,
        }));
    });

    it('two parallel refreshes: only first succeeds, second is rejected', async () => {
        const rtRepo = makeRefreshTokenRepo();
        // First call succeeds (consumeActive returns the record)
        // Second call would get null (simulated by calling the same mock a second time)
        (rtRepo.consumeActive as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce(validRecord)  // first request wins
            .mockResolvedValueOnce(null);          // second request loses

        const uc = new RefreshUseCase(rtRepo, makeUserRepo(), makeTokenService());

        const [first, second] = await Promise.allSettled([
            uc.execute({ refreshToken: 'tok' }),
            uc.execute({ refreshToken: 'tok' }),
        ]);

        expect(first.status).toBe('fulfilled');
        expect(second.status).toBe('rejected');
        expect((second as PromiseRejectedResult).reason).toBeInstanceOf(InvalidRefreshTokenError);
    });
});
