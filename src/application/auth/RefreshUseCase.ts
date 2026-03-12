import { randomUUID } from 'crypto';
import { RefreshTokenRepository } from '@/application/ports/RefreshTokenRepository';
import { UserRepository } from '@/application/ports/UserRepository';
import { TokenService } from '@/application/ports/TokenService';
import { InvalidRefreshTokenError } from '@/domain/auth/errors';

export interface RefreshInput {
    refreshToken: string;
}

export interface RefreshOutput {
    accessToken: string;
    refreshToken: string;
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class RefreshUseCase {
    constructor(
        private refreshTokenRepository: RefreshTokenRepository,
        private userRepository: UserRepository,
        private tokenService: TokenService,
    ) {}

    async execute(input: RefreshInput): Promise<RefreshOutput> {
        const payload = await this.tokenService.verifyRefreshToken(input.refreshToken);
        if (!payload) throw new InvalidRefreshTokenError();

        // consumeActive atomically revokes the token only if it is active and not expired.
        // This eliminates the TOCTOU race: concurrent refreshes get count=0 → 401.
        const record = await this.refreshTokenRepository.consumeActive(payload.jti, new Date());
        if (!record) {
            throw new InvalidRefreshTokenError();
        }

        const user = await this.userRepository.findById(record.userId);
        if (!user) throw new InvalidRefreshTokenError();

        const accessToken = await this.tokenService.signAccessToken({
            sub: user.id,
            role: user.role,
            email: user.email,
        });

        const newJti = randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

        const refreshToken = await this.tokenService.signRefreshToken({
            sub: user.id,
            jti: newJti,
        });

        await this.refreshTokenRepository.save({
            id: newJti,
            userId: user.id,
            revoked: false,
            expiresAt,
            createdAt: now,
        });

        return { accessToken, refreshToken };
    }
}
