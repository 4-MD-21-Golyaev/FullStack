import { randomUUID } from 'crypto';
import { OtpRepository } from '@/application/ports/OtpRepository';
import { UserRepository } from '@/application/ports/UserRepository';
import { RefreshTokenRepository } from '@/application/ports/RefreshTokenRepository';
import { TokenService } from '@/application/ports/TokenService';
import { InvalidOtpError, UserNotFoundError } from '@/domain/auth/errors';

export interface VerifyCodeInput {
    email: string;
    code: string;
}

export interface VerifyCodeOutput {
    accessToken: string;
    refreshToken: string;
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class VerifyCodeUseCase {
    constructor(
        private otpRepository: OtpRepository,
        private userRepository: UserRepository,
        private refreshTokenRepository: RefreshTokenRepository,
        private tokenService: TokenService,
    ) {}

    async execute(input: VerifyCodeInput): Promise<VerifyCodeOutput> {
        const valid = await this.otpRepository.verify(input.email, input.code);
        if (!valid) throw new InvalidOtpError();

        const user = await this.userRepository.findByEmail(input.email);
        if (!user) throw new UserNotFoundError(input.email);

        const accessToken = await this.tokenService.signAccessToken({
            sub: user.id,
            role: user.role,
            email: user.email,
        });

        const jti = randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

        const refreshToken = await this.tokenService.signRefreshToken({
            sub: user.id,
            jti,
        });

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
