import { NextRequest, NextResponse } from 'next/server';
import { createOtpInDB } from '@/lib/auth/otp';
import { sendOtpEmail } from '@/lib/auth/email';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ message: 'email is required' }, { status: 400 });
        }

        const code = await createOtpInDB(email);

        // Fire-and-forget: send email but don't block response on it
        sendOtpEmail(email, code).catch((err) => {
            console.error('[request-code] Failed to send OTP email:', err);
        });

        // Always return ok to prevent email enumeration
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
