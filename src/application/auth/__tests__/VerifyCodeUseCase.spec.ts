import { describe, it, expect, vi } from 'vitest';
import { VerifyCodeUseCase } from '../VerifyCodeUseCase';
import { OtpRepository } from '@/application/ports/OtpRepository';
import { UserRepository } from '@/application/ports/UserRepository';
import { RefreshTokenRepository } from '@/application/ports/RefreshTokenRepository';
import { TokenService } from '@/application/ports/TokenService';
import { InvalidOtpError, UserNotFoundError } from '@/domain/auth/errors';

const mockUser = { id: 'u1', email: 'a@b.com', role: 'CUSTOMER', phone: '+7', address: null };

function makeOtpRepo(valid = true): OtpRepository {
    return { create: vi.fn(), verify: vi.fn().mockResolvedValue(valid) };
}

function makeUserRepo(user: unknown = mockUser): UserRepository {
    return { findByEmail: vi.fn().mockResolvedValue(user), findById: vi.fn(), create: vi.fn() };
}

function makeRefreshTokenRepo(): RefreshTokenRepository {
    return { save: vi.fn(), findById: vi.fn(), revoke: vi.fn(), revokeAllForUser: vi.fn() };
}

function makeTokenService(): TokenService {
    return {
        signAccessToken: vi.fn().mockResolvedValue('access-jwt'),
        signRefreshToken: vi.fn().mockResolvedValue('refresh-jwt'),
        verifyAccessToken: vi.fn(),
        verifyRefreshToken: vi.fn(),
    };
}

describe('VerifyCodeUseCase', () => {
    it('throws InvalidOtpError when OTP is invalid', async () => {
        const uc = new VerifyCodeUseCase(makeOtpRepo(false), makeUserRepo(), makeRefreshTokenRepo(), makeTokenService());

        await expect(uc.execute({ email: 'a@b.com', code: '000000' }))
            .rejects.toThrow(InvalidOtpError);
    });

    it('throws UserNotFoundError when user does not exist', async () => {
        const uc = new VerifyCodeUseCase(makeOtpRepo(true), makeUserRepo(null), makeRefreshTokenRepo(), makeTokenService());

        await expect(uc.execute({ email: 'a@b.com', code: '123456' }))
            .rejects.toThrow(UserNotFoundError);
    });

    it('returns both tokens and saves refresh token record on success', async () => {
        const rtRepo = makeRefreshTokenRepo();
        const tokenSvc = makeTokenService();
        const uc = new VerifyCodeUseCase(makeOtpRepo(true), makeUserRepo(), rtRepo, tokenSvc);

        const result = await uc.execute({ email: 'a@b.com', code: '123456' });

        expect(result.accessToken).toBe('access-jwt');
        expect(result.refreshToken).toBe('refresh-jwt');
        expect(tokenSvc.signAccessToken).toHaveBeenCalledWith({ sub: 'u1', role: 'CUSTOMER', email: 'a@b.com' });
        expect(tokenSvc.signRefreshToken).toHaveBeenCalledWith({ sub: 'u1', jti: expect.any(String) });
        expect(rtRepo.save).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'u1',
            revoked: false,
        }));
    });
});
