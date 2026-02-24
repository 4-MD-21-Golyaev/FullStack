import { NextRequest, NextResponse } from 'next/server';
import { VerifyCodeUseCase } from '@/application/auth/VerifyCodeUseCase';
import { PrismaOtpRepository } from '@/infrastructure/repositories/OtpRepository.prisma';
import { PrismaUserRepository } from '@/infrastructure/repositories/UserRepository.prisma';
import { PrismaRefreshTokenRepository } from '@/infrastructure/repositories/RefreshTokenRepository.prisma';
import { JoseTokenService } from '@/infrastructure/auth/JoseTokenService';
import { setTokenCookies } from '@/lib/auth/session';
import { InvalidOtpError, UserNotFoundError } from '@/domain/auth/errors';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, code } = body;

        if (!email || !code) {
            return NextResponse.json({ message: 'email and code are required' }, { status: 400 });
        }

        const useCase = new VerifyCodeUseCase(
            new PrismaOtpRepository(),
            new PrismaUserRepository(),
            new PrismaRefreshTokenRepository(),
            new JoseTokenService(),
        );

        const { accessToken, refreshToken } = await useCase.execute({ email, code });

        const res = NextResponse.json({ ok: true });
        setTokenCookies(res, accessToken, refreshToken);
        return res;
    } catch (error: unknown) {
        if (error instanceof InvalidOtpError) {
            return NextResponse.json({ message: error.message }, { status: 401 });
        }
        if (error instanceof UserNotFoundError) {
            return NextResponse.json({ message: error.message }, { status: 404 });
        }
        return NextResponse.json({ message: (error as Error).message }, { status: 400 });
    }
}
