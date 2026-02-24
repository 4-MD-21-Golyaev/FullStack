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

        const record = await this.refreshTokenRepository.findById(payload.jti);
        if (!record || record.revoked || record.expiresAt < new Date()) {
            throw new InvalidRefreshTokenError();
        }

        await this.refreshTokenRepository.revoke(record.id);

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
