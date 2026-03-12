import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';

// Routes accessible without authentication
const PUBLIC_PREFIXES = [
    '/api/products',
    '/api/categories',
    '/api/auth/register',
    '/api/auth/request-code',
    '/api/auth/verify-code',
    '/api/auth/refresh',
    '/api/webhooks/yookassa',
    '/api/webhooks/moysklad',
];

// Operational roles for picking
const PICKER_ROLES = new Set(['STAFF', 'PICKER', 'ADMIN']);
// Operational roles for delivery
const COURIER_ROLES = new Set(['COURIER', 'ADMIN']);
// Admin-only
const ADMIN_ROLES = new Set(['ADMIN']);

function isPublic(pathname: string): boolean {
    return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPickerRoute(pathname: string, method: string): boolean {
    if (pathname.startsWith('/api/picker/')) return true;
    // Legacy order routes that require picker role
    if (pathname.match(/^\/api\/orders\/[^/]+\/start-picking$/) && method === 'POST') return true;
    if (pathname.match(/^\/api\/orders\/[^/]+\/complete-picking$/) && method === 'POST') return true;
    if (pathname.match(/^\/api\/orders\/[^/]+\/close$/) && method === 'POST') return true;
    if (pathname.match(/^\/api\/orders\/[^/]+\/items$/) && method === 'PATCH') return true;
    return false;
}

function isCourierRoute(pathname: string): boolean {
    return pathname.startsWith('/api/courier/');
}

function isAdminRoute(pathname: string): boolean {
    return pathname.startsWith('/api/admin/');
}

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Strip any spoofed x-user-* headers from clients
    const requestHeaders = new Headers(req.headers);
    requestHeaders.delete('x-user-id');
    requestHeaders.delete('x-user-role');
    requestHeaders.delete('x-user-email');

    // Internal jobs: доступны ТОЛЬКО по INTERNAL_JOB_SECRET, без fallback на JWT
    if (pathname.startsWith('/api/internal/jobs/')) {
        const INTERNAL_JOB_SECRET = process.env.INTERNAL_JOB_SECRET;
        if (!INTERNAL_JOB_SECRET) {
            console.error('[proxy] INTERNAL_JOB_SECRET is not configured');
            return NextResponse.json(
                { message: 'Internal jobs auth misconfigured' },
                { status: 500 },
            );
        }
        const authHeader = req.headers.get('authorization') ?? '';
        if (authHeader !== `Bearer ${INTERNAL_JOB_SECRET}`) {
            console.warn('[proxy] Rejected internal job request to', pathname);
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.next(); // только по секрету, JWT не проверяем
    }

    // Cron jobs: accessible ONLY via CRON_SECRET, no JWT fallback
    if (pathname.startsWith('/api/cron/')) {
        const CRON_SECRET = process.env.CRON_SECRET;
        if (!CRON_SECRET) {
            console.error('[proxy] CRON_SECRET is not configured');
            return NextResponse.json(
                { message: 'Cron auth misconfigured' },
                { status: 500 },
            );
        }
        const authHeader = req.headers.get('authorization') ?? '';
        if (authHeader !== `Bearer ${CRON_SECRET}`) {
            console.warn('[proxy] Rejected cron request to', pathname);
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.next();
    }

    if (isPublic(pathname)) {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Only gate /api/ routes
    if (!pathname.startsWith('/api/')) {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const token = req.cookies.get('access_token')?.value ?? null;
    const session = token ? await verifyJwt(token) : null;

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const method = req.method;
    const role = session.role;

    // Admin routes: ADMIN only
    if (isAdminRoute(pathname) && !ADMIN_ROLES.has(role)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Picker routes: STAFF (transitional), PICKER, ADMIN
    if (isPickerRoute(pathname, method) && !PICKER_ROLES.has(role)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Courier routes: COURIER, ADMIN
    if (isCourierRoute(pathname) && !COURIER_ROLES.has(role)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Attach user info to downstream request headers
    requestHeaders.set('x-user-id', session.sub);
    requestHeaders.set('x-user-role', session.role);
    requestHeaders.set('x-user-email', session.email);

    return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
    matcher: ['/api/:path*'],
};
