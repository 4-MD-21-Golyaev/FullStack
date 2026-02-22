import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';

// Routes accessible without authentication
const PUBLIC_PREFIXES = [
    '/api/products',
    '/api/categories',
    '/api/auth',
    '/api/webhooks/yookassa',
    '/api/cron',
];

// Routes that require STAFF or ADMIN role (all methods)
const STAFF_ONLY_PATTERNS = [
    /^\/api\/orders\/[^/]+\/start-picking$/,
    /^\/api\/orders\/[^/]+\/complete-picking$/,
    /^\/api\/orders\/[^/]+\/close$/,
];

function isPublic(pathname: string): boolean {
    return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isStaffOnly(pathname: string, method: string): boolean {
    // PATCH /api/orders/[id]/items requires STAFF/ADMIN
    if (pathname.match(/^\/api\/orders\/[^/]+\/items$/) && method === 'PATCH') return true;
    return STAFF_ONLY_PATTERNS.some((pattern) => pattern.test(pathname));
}

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Strip any spoofed x-user-* headers from clients
    const requestHeaders = new Headers(req.headers);
    requestHeaders.delete('x-user-id');
    requestHeaders.delete('x-user-role');
    requestHeaders.delete('x-user-email');

    // Internal jobs: доступны по INTERNAL_JOB_SECRET заголовку
    const INTERNAL_JOB_SECRET = process.env.INTERNAL_JOB_SECRET;
    if (pathname.startsWith('/api/internal/jobs/')) {
        const authHeader = req.headers.get('authorization') ?? '';
        if (INTERNAL_JOB_SECRET && authHeader === `Bearer ${INTERNAL_JOB_SECRET}`) {
            return NextResponse.next(); // пропускаем JWT-проверку
        }
        // Иначе — продолжаем стандартную проверку (ADMIN через JWT тоже допустим)
    }

    if (isPublic(pathname)) {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Only gate /api/ routes
    if (!pathname.startsWith('/api/')) {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const token = req.cookies.get('session')?.value ?? null;
    const session = token ? await verifyJwt(token) : null;

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const method = req.method;
    const staffOnly = isStaffOnly(pathname, method);

    if (staffOnly && session.role === 'CUSTOMER') {
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
