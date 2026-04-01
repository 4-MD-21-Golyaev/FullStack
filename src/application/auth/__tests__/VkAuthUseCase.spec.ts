import { describe, it, expect, vi } from 'vitest';
import { VkAuthUseCase } from '../VkAuthUseCase';
import { type VkIdentityRepository } from '@/application/ports/VkIdentityRepository';
import { type UserRepository } from '@/application/ports/UserRepository';
import { type RefreshTokenRepository } from '@/application/ports/RefreshTokenRepository';
import { type TokenService } from '@/application/ports/TokenService';
import { InvalidVkSignatureError, VkIdentityNotLinkedError, UserNotFoundError } from '@/domain/auth/errors';

// Pre-computed valid signature for the test query string using secret "test-secret"
// Params: vk_app_id=1&vk_user_id=42  → sorted → "vk_app_id=1&vk_user_id=42"
// HMAC-SHA256("test-secret", "vk_app_id=1&vk_user_id=42") → base64url
import { createHmac } from 'crypto';

function makeSign(params: string, secret: string): string {
    return createHmac('sha256', secret).update(params).digest('base64url');
}

const SECRET = 'test-secret';
const VK_USER_ID = '42';
const SORTED_PARAMS = `vk_app_id=1&vk_user_id=${VK_USER_ID}`;
const SIGN = makeSign(SORTED_PARAMS, SECRET);
const VALID_QS = `vk_app_id=1&vk_user_id=${VK_USER_ID}&sign=${SIGN}`;

const mockUser = { id: 'u1', email: 'admin@test.com', role: 'ADMIN', phone: '+7', address: null };

function makeVkRepo(userId: string | null = 'u1'): VkIdentityRepository {
    return {
        findUserIdByVkUserId: vi.fn().mockResolvedValue(userId),
        link: vi.fn(),
        unlink: vi.fn(),
    };
}

function makeUserRepo(user: unknown = mockUser): UserRepository {
    return { findByEmail: vi.fn(), findById: vi.fn().mockResolvedValue(user), create: vi.fn() };
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

function makeUseCase(overrides: {
    vkRepo?: VkIdentityRepository;
    userRepo?: UserRepository;
    rtRepo?: RefreshTokenRepository;
    tokenSvc?: TokenService;
} = {}) {
    return new VkAuthUseCase(
        overrides.vkRepo ?? makeVkRepo(),
        overrides.userRepo ?? makeUserRepo(),
        overrides.rtRepo ?? makeRefreshTokenRepo(),
        overrides.tokenSvc ?? makeTokenService(),
    );
}

describe('VkAuthUseCase', () => {
    it('throws InvalidVkSignatureError when signature is wrong', async () => {
        const uc = makeUseCase();
        await expect(uc.execute({ queryString: 'vk_user_id=42&sign=bad', clientSecret: SECRET }))
            .rejects.toThrow(InvalidVkSignatureError);
    });

    it('throws InvalidVkSignatureError when sign param is missing', async () => {
        const uc = makeUseCase();
        await expect(uc.execute({ queryString: 'vk_user_id=42', clientSecret: SECRET }))
            .rejects.toThrow(InvalidVkSignatureError);
    });

    it('throws VkIdentityNotLinkedError when VK user is not linked', async () => {
        const uc = makeUseCase({ vkRepo: makeVkRepo(null) });
        await expect(uc.execute({ queryString: VALID_QS, clientSecret: SECRET }))
            .rejects.toThrow(VkIdentityNotLinkedError);
    });

    it('throws UserNotFoundError when linked user does not exist in DB', async () => {
        const uc = makeUseCase({ userRepo: makeUserRepo(null) });
        await expect(uc.execute({ queryString: VALID_QS, clientSecret: SECRET }))
            .rejects.toThrow(UserNotFoundError);
    });

    it('returns both tokens and saves refresh token on success', async () => {
        const rtRepo = makeRefreshTokenRepo();
        const tokenSvc = makeTokenService();
        const uc = makeUseCase({ rtRepo, tokenSvc });

        const result = await uc.execute({ queryString: VALID_QS, clientSecret: SECRET });

        expect(result.accessToken).toBe('access-jwt');
        expect(result.refreshToken).toBe('refresh-jwt');
        expect(tokenSvc.signAccessToken).toHaveBeenCalledWith({ sub: 'u1', role: 'ADMIN', email: 'admin@test.com' });
        expect(tokenSvc.signRefreshToken).toHaveBeenCalledWith({ sub: 'u1', jti: expect.any(String) });
        expect(rtRepo.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', revoked: false }));
    });
});
