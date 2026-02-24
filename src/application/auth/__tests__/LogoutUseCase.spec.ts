import { describe, it, expect, vi } from 'vitest';
import { LogoutUseCase } from '../LogoutUseCase';
import { RefreshTokenRepository } from '@/application/ports/RefreshTokenRepository';
import { TokenService } from '@/application/ports/TokenService';

function makeRefreshTokenRepo(): RefreshTokenRepository {
    return { save: vi.fn(), findById: vi.fn(), revoke: vi.fn(), revokeAllForUser: vi.fn() };
}

function makeTokenService(payload: unknown = { sub: 'u1', jti: 'jti-1' }): TokenService {
    return {
        signAccessToken: vi.fn(),
        signRefreshToken: vi.fn(),
        verifyAccessToken: vi.fn(),
        verifyRefreshToken: vi.fn().mockResolvedValue(payload),
    };
}

describe('LogoutUseCase', () => {
    it('revokes refresh token record', async () => {
        const repo = makeRefreshTokenRepo();
        const uc = new LogoutUseCase(repo, makeTokenService());

        await uc.execute({ refreshToken: 'tok' });

        expect(repo.revoke).toHaveBeenCalledWith('jti-1');
    });

    it('silently succeeds when token is invalid', async () => {
        const repo = makeRefreshTokenRepo();
        const uc = new LogoutUseCase(repo, makeTokenService(null));

        await uc.execute({ refreshToken: 'bad' });

        expect(repo.revoke).not.toHaveBeenCalled();
    });
});
