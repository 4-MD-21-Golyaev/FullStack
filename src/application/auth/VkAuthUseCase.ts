import { randomUUID } from 'crypto';
import { type VkIdentityRepository } from '@/application/ports/VkIdentityRepository';
import { type UserRepository } from '@/application/ports/UserRepository';
import { type RefreshTokenRepository } from '@/application/ports/RefreshTokenRepository';
import { type TokenService } from '@/application/ports/TokenService';
import { InvalidVkSignatureError, VkIdentityNotLinkedError, UserNotFoundError } from '@/domain/auth/errors';
import { validateVkSignature } from '@/lib/auth/vk-signature';

export interface VkAuthInput {
    /** Raw query string from VK Mini App launch URL (everything after "?") */
    queryString: string;
    /** VK app client_secret for signature validation */
    clientSecret: string;
}

export interface VkAuthOutput {
    accessToken: string;
    refreshToken: string;
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class VkAuthUseCase {
    constructor(
        private vkIdentityRepository: VkIdentityRepository,
        private userRepository: UserRepository,
        private refreshTokenRepository: RefreshTokenRepository,
        private tokenService: TokenService,
    ) {}

    async execute(input: VkAuthInput): Promise<VkAuthOutput> {
        if (!validateVkSignature(input.queryString, input.clientSecret)) {
            throw new InvalidVkSignatureError();
        }

        const params = new URLSearchParams(input.queryString);
        const vkUserId = params.get('vk_user_id');
        if (!vkUserId) throw new InvalidVkSignatureError();

        const userId = await this.vkIdentityRepository.findUserIdByVkUserId(vkUserId);
        if (!userId) throw new VkIdentityNotLinkedError();

        const user = await this.userRepository.findById(userId);
        if (!user) throw new UserNotFoundError(userId);

        const accessToken = await this.tokenService.signAccessToken({
            sub: user.id,
            role: user.role,
            email: user.email,
        });

        const jti = randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

        const refreshToken = await this.tokenService.signRefreshToken({ sub: user.id, jti });

        await this.refreshTokenRepository.save({
            id: jti,
            userId: user.id,
            revoked: false,
            expiresAt,
            createdAt: now,
        });

        return { accessToken, refreshToken };
    }
}
