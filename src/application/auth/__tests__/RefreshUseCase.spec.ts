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
    revoked: false,
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
};

function makeRefreshTokenRepo(record: unknown = validRecord): RefreshTokenRepository {
    return {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(record),
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

    it('throws when record not found in DB', async () => {
        const uc = new RefreshUseCase(makeRefreshTokenRepo(null), makeUserRepo(), makeTokenService());

        await expect(uc.execute({ refreshToken: 'tok' }))
            .rejects.toThrow(InvalidRefreshTokenError);
    });

    it('throws when record is revoked', async () => {
        const uc = new RefreshUseCase(
            makeRefreshTokenRepo({ ...validRecord, revoked: true }),
            makeUserRepo(),
            makeTokenService(),
        );

        await expect(uc.execute({ refreshToken: 'tok' }))
            .rejects.toThrow(InvalidRefreshTokenError);
    });

    it('throws when record is expired', async () => {
        const uc = new RefreshUseCase(
            makeRefreshTokenRepo({ ...validRecord, expiresAt: new Date(Date.now() - 1000) }),
            makeUserRepo(),
            makeTokenService(),
        );

        await expect(uc.execute({ refreshToken: 'tok' }))
            .rejects.toThrow(InvalidRefreshTokenError);
    });

    it('revokes old token, issues new pair, saves new record', async () => {
        const rtRepo = makeRefreshTokenRepo();
        const tokenSvc = makeTokenService();
        const uc = new RefreshUseCase(rtRepo, makeUserRepo(), tokenSvc);

        const result = await uc.execute({ refreshToken: 'tok' });

        expect(result.accessToken).toBe('new-access');
        expect(result.refreshToken).toBe('new-refresh');
        expect(rtRepo.revoke).toHaveBeenCalledWith('jti-1');
        expect(rtRepo.save).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'u1',
            revoked: false,
        }));
    });
});
