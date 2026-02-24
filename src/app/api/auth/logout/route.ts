import { NextRequest, NextResponse } from 'next/server';
import { LogoutUseCase } from '@/application/auth/LogoutUseCase';
import { PrismaRefreshTokenRepository } from '@/infrastructure/repositories/RefreshTokenRepository.prisma';
import { JoseTokenService } from '@/infrastructure/auth/JoseTokenService';
import { getRefreshToken, clearTokenCookies } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
    const refreshToken = getRefreshToken(req);

    if (refreshToken) {
        const useCase = new LogoutUseCase(
            new PrismaRefreshTokenRepository(),
            new JoseTokenService(),
        );
        await useCase.execute({ refreshToken });
    }

    const res = NextResponse.json({ ok: true });
    clearTokenCookies(res);
    return res;
}
