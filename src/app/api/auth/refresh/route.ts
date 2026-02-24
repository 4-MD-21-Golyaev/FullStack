import { NextRequest, NextResponse } from 'next/server';
import { RefreshUseCase } from '@/application/auth/RefreshUseCase';
import { PrismaRefreshTokenRepository } from '@/infrastructure/repositories/RefreshTokenRepository.prisma';
import { PrismaUserRepository } from '@/infrastructure/repositories/UserRepository.prisma';
import { JoseTokenService } from '@/infrastructure/auth/JoseTokenService';
import { getRefreshToken, setTokenCookies } from '@/lib/auth/session';
import { InvalidRefreshTokenError } from '@/domain/auth/errors';

export async function POST(req: NextRequest) {
    try {
        const refreshToken = getRefreshToken(req);
        if (!refreshToken) {
            return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
        }

        const useCase = new RefreshUseCase(
            new PrismaRefreshTokenRepository(),
            new PrismaUserRepository(),
            new JoseTokenService(),
        );

        const result = await useCase.execute({ refreshToken });

        const res = NextResponse.json({ ok: true });
        setTokenCookies(res, result.accessToken, result.refreshToken);
        return res;
    } catch (error: unknown) {
        if (error instanceof InvalidRefreshTokenError) {
            return NextResponse.json({ message: error.message }, { status: 401 });
        }
        return NextResponse.json({ message: (error as Error).message }, { status: 400 });
    }
}
