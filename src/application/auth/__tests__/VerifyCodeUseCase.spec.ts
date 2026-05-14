import { describe, it, expect, vi } from 'vitest';
import { VerifyCodeUseCase } from '../VerifyCodeUseCase';
import { type OtpRepository } from '@/application/ports/OtpRepository';
import { type UserRepository } from '@/application/ports/UserRepository';
import { type RefreshTokenRepository } from '@/application/ports/RefreshTokenRepository';
import { type TokenService } from '@/application/ports/TokenService';
import { InvalidOtpError } from '@/domain/auth/errors';

const mockUser = { id: 'u1', email: 'a@b.com', role: 'CUSTOMER', phone: '+7', address: null };

function makeOtpRepo(valid = true): OtpRepository {
    return { create: vi.fn(), verify: vi.fn().mockResolvedValue(valid) };
}

function makeUserRepo(user: unknown = mockUser, created: unknown = mockUser): UserRepository {
    return {
        findByEmail: vi.fn().mockResolvedValue(user),
        findById: vi.fn(),
        create: vi.fn().mockResolvedValue(created),
    };
}

function makeRefreshTokenRepo(): RefreshTokenRepository {
    return { save: vi.fn(), findById: vi.fn(), revoke: vi.fn(), revokeAllForUser: vi.fn(), consumeActive: vi.fn() };
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

    it('auto-creates a CUSTOMER account when user does not exist and issues tokens', async () => {
        const createdUser = { id: 'u-new', email: 'new@b.com', role: 'CUSTOMER', phone: '', address: null };
        const userRepo = makeUserRepo(null, createdUser);
        const rtRepo = makeRefreshTokenRepo();
        const tokenSvc = makeTokenService();
        const uc = new VerifyCodeUseCase(makeOtpRepo(true), userRepo, rtRepo, tokenSvc);

        const result = await uc.execute({ email: 'new@b.com', code: '123456' });

        expect(userRepo.create).toHaveBeenCalledWith({
            email: 'new@b.com',
            phone: '',
            address: null,
            role: 'CUSTOMER',
        });
        expect(result.accessToken).toBe('access-jwt');
        expect(result.refreshToken).toBe('refresh-jwt');
        expect(result.role).toBe('CUSTOMER');
        expect(tokenSvc.signAccessToken).toHaveBeenCalledWith({ sub: 'u-new', role: 'CUSTOMER', email: 'new@b.com' });
        expect(tokenSvc.signRefreshToken).toHaveBeenCalledWith({ sub: 'u-new', jti: expect.any(String) });
        expect(rtRepo.save).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'u-new',
            revoked: false,
        }));
    });

    it('returns both tokens and saves refresh token record on success', async () => {
        const rtRepo = makeRefreshTokenRepo();
        const tokenSvc = makeTokenService();
        const uc = new VerifyCodeUseCase(makeOtpRepo(true), makeUserRepo(), rtRepo, tokenSvc);

        const result = await uc.execute({ email: 'a@b.com', code: '123456' });

        expect(result.accessToken).toBe('access-jwt');
        expect(result.refreshToken).toBe('refresh-jwt');
        expect(result.role).toBe('CUSTOMER');
        expect(tokenSvc.signAccessToken).toHaveBeenCalledWith({ sub: 'u1', role: 'CUSTOMER', email: 'a@b.com' });
        expect(tokenSvc.signRefreshToken).toHaveBeenCalledWith({ sub: 'u1', jti: expect.any(String) });
        expect(rtRepo.save).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'u1',
            revoked: false,
        }));
    });
});
