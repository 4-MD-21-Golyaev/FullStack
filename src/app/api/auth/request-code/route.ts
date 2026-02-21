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

        // In development return the code directly so the test page works without SMTP
        const body: Record<string, unknown> = { ok: true };
        if (process.env.NODE_ENV === 'development') {
            body.code = code;
        }
        return NextResponse.json(body);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
