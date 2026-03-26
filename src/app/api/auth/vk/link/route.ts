import { NextRequest, NextResponse } from 'next/server';
import { PrismaVkIdentityRepository } from '@/infrastructure/repositories/VkIdentityRepository.prisma';
import { InvalidVkSignatureError } from '@/domain/auth/errors';
import { validateVkSignature } from '@/lib/auth/vk-signature';

/** Links the authenticated user's account to a VK identity.
 *  Requires a valid session (x-user-id header set by middleware).
 *  Body: { queryString: string } — the VK Mini App launch query string.
 */
export async function POST(req: NextRequest) {
    try {
        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const clientSecret = process.env.VK_APP_SECRET;
        if (!clientSecret) {
            return NextResponse.json({ message: 'VK auth is not configured' }, { status: 503 });
        }

        const body = await req.json();
        const { queryString } = body;

        if (!queryString || typeof queryString !== 'string') {
            return NextResponse.json({ message: 'queryString is required' }, { status: 400 });
        }

        if (!validateVkSignature(queryString, clientSecret)) {
            throw new InvalidVkSignatureError();
        }

        const params = new URLSearchParams(queryString);
        const vkUserId = params.get('vk_user_id');
        if (!vkUserId) {
            return NextResponse.json({ message: 'vk_user_id is missing in queryString' }, { status: 400 });
        }

        await new PrismaVkIdentityRepository().link(vkUserId, userId);

        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        if (error instanceof InvalidVkSignatureError) {
            return NextResponse.json({ message: error.message }, { status: 401 });
        }
        return NextResponse.json({ message: (error as Error).message }, { status: 500 });
    }
}

/** Removes the VK identity link for the authenticated user. */
export async function DELETE(req: NextRequest) {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await new PrismaVkIdentityRepository().unlink(userId);
    return NextResponse.json({ ok: true });
}
