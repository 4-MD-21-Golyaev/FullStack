import { RefreshTokenRepository } from '@/application/ports/RefreshTokenRepository';
import { TokenService } from '@/application/ports/TokenService';

export interface LogoutInput {
    refreshToken: string;
}

export class LogoutUseCase {
    constructor(
        private refreshTokenRepository: RefreshTokenRepository,
        private tokenService: TokenService,
    ) {}

    async execute(input: LogoutInput): Promise<void> {
        const payload = await this.tokenService.verifyRefreshToken(input.refreshToken);
        if (!payload) return;

        await this.refreshTokenRepository.revoke(payload.jti);
    }
}
