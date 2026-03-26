import { NextRequest, NextResponse } from 'next/server';
import { VkAuthUseCase } from '@/application/auth/VkAuthUseCase';
import { PrismaVkIdentityRepository } from '@/infrastructure/repositories/VkIdentityRepository.prisma';
import { PrismaUserRepository } from '@/infrastructure/repositories/UserRepository.prisma';
import { PrismaRefreshTokenRepository } from '@/infrastructure/repositories/RefreshTokenRepository.prisma';
import { JoseTokenService } from '@/infrastructure/auth/JoseTokenService';
import { setTokenCookies } from '@/lib/auth/session';
import { InvalidVkSignatureError, VkIdentityNotLinkedError, UserNotFoundError } from '@/domain/auth/errors';

export async function POST(req: NextRequest) {
    console.log('[vk-route] POST /api/auth/vk called');
    try {
        const clientSecret = process.env.VK_APP_SECRET;
        console.log('[vk-route] VK_APP_SECRET set:', !!clientSecret);
        if (!clientSecret) {
            return NextResponse.json({ message: 'VK auth is not configured' }, { status: 503 });
        }

        const body = await req.json();
        const { queryString } = body;

        if (!queryString || typeof queryString !== 'string') {
            return NextResponse.json({ message: 'queryString is required' }, { status: 400 });
        }

        const useCase = new VkAuthUseCase(
            new PrismaVkIdentityRepository(),
            new PrismaUserRepository(),
            new PrismaRefreshTokenRepository(),
            new JoseTokenService(),
        );

        const { accessToken, refreshToken } = await useCase.execute({ queryString, clientSecret });

        const res = NextResponse.json({ ok: true });
        setTokenCookies(res, accessToken, refreshToken);
        return res;
    } catch (error: unknown) {
        if (error instanceof InvalidVkSignatureError) {
            return NextResponse.json({ message: error.message }, { status: 401 });
        }
        if (error instanceof VkIdentityNotLinkedError) {
            return NextResponse.json({ message: error.message }, { status: 403 });
        }
        if (error instanceof UserNotFoundError) {
            return NextResponse.json({ message: error.message }, { status: 404 });
        }
        return NextResponse.json({ message: (error as Error).message }, { status: 500 });
    }
}
