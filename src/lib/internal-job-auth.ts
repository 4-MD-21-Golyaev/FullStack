import { NextRequest, NextResponse } from 'next/server';

type AuthResult = { ok: true } | NextResponse;

/**
 * Defense-in-depth guard for /api/internal/jobs/* route handlers.
 * Primary enforcement lives in proxy.ts; this is a secondary layer so that
 * a misconfigured or refactored proxy never exposes the endpoint.
 */
export function assertInternalJobAuth(req: NextRequest): AuthResult {
    const secret = process.env.INTERNAL_JOB_SECRET;

    if (!secret) {
        console.error('[internal-job-auth] INTERNAL_JOB_SECRET is not configured');
        return NextResponse.json(
            { message: 'Internal jobs auth misconfigured' },
            { status: 500 },
        );
    }

    const authHeader = req.headers.get('authorization') ?? '';
    if (authHeader !== `Bearer ${secret}`) {
        console.warn('[internal-job-auth] Rejected request to', req.nextUrl.pathname);
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return { ok: true };
}
