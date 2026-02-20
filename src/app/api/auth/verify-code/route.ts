import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/db/prismaClient';
import { verifyOtpInDB } from '@/lib/auth/otp';
import { signJwt } from '@/lib/auth/jwt';
import { setSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, code } = body;

        if (!email || !code) {
            return NextResponse.json({ message: 'email and code are required' }, { status: 400 });
        }

        const valid = await verifyOtpInDB(email, code);
        if (!valid) {
            return NextResponse.json({ message: 'Invalid or expired code' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        const token = await signJwt({
            sub: user.id,
            role: user.role as 'CUSTOMER' | 'STAFF' | 'ADMIN',
            email: user.email,
        });

        const res = NextResponse.json({ ok: true });
        setSessionCookie(res, token);
        return res;
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
