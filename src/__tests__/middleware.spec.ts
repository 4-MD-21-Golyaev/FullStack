import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/jwt', () => ({
    verifyJwt: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { proxy } from '../proxy';
import { verifyJwt } from '@/lib/auth/jwt';

const mockVerify = verifyJwt as ReturnType<typeof vi.fn>;

function makeReq(path: string, options?: { method?: string; cookie?: string; headers?: Record<string, string> }): NextRequest {
    const headers: Record<string, string> = { ...options?.headers };
    if (options?.cookie) {
        headers['Cookie'] = options.cookie;
    }
    return new NextRequest(`http://localhost${path}`, {
        method: options?.method ?? 'GET',
        headers,
    });
}

const CUSTOMER_SESSION = { sub: 'user-1', role: 'CUSTOMER', email: 'customer@example.com' };
const STAFF_SESSION = { sub: 'user-2', role: 'STAFF', email: 'staff@example.com' };
const ADMIN_SESSION = { sub: 'user-3', role: 'ADMIN', email: 'admin@example.com' };

describe('middleware', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('GET /api/products (public) passes through with 200', async () => {
        const req = makeReq('/api/products');
        const res = await proxy(req);
        expect(res.status).toBe(200);
        expect(mockVerify).not.toHaveBeenCalled();
    });

    it('POST /api/auth/register (public) passes through with 200', async () => {
        const req = makeReq('/api/auth/register', { method: 'POST' });
        const res = await proxy(req);
        expect(res.status).toBe(200);
        expect(mockVerify).not.toHaveBeenCalled();
    });

    it('POST /api/auth/refresh (public) passes through with 200', async () => {
        const req = makeReq('/api/auth/refresh', { method: 'POST' });
        const res = await proxy(req);
        expect(res.status).toBe(200);
        expect(mockVerify).not.toHaveBeenCalled();
    });

    it('GET /api/auth/me (protected) without cookie returns 401', async () => {
        const req = makeReq('/api/auth/me');
        const res = await proxy(req);
        expect(res.status).toBe(401);
    });

    it('POST /api/auth/logout (protected) without cookie returns 401', async () => {
        const req = makeReq('/api/auth/logout', { method: 'POST' });
        const res = await proxy(req);
        expect(res.status).toBe(401);
    });

    it('GET /api/orders without cookie returns 401', async () => {
        const req = makeReq('/api/orders');
        const res = await proxy(req);
        expect(res.status).toBe(401);
    });

    it('GET /api/orders with invalid JWT returns 401', async () => {
        mockVerify.mockResolvedValue(null);
        const req = makeReq('/api/orders', { cookie: 'access_token=badtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(401);
    });

    it('GET /api/orders with valid CUSTOMER JWT returns 200', async () => {
        mockVerify.mockResolvedValue(CUSTOMER_SESSION);
        const req = makeReq('/api/orders', { cookie: 'access_token=validtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(200);
    });

    it('POST /api/orders/123/start-picking with CUSTOMER JWT returns 403', async () => {
        mockVerify.mockResolvedValue(CUSTOMER_SESSION);
        const req = makeReq('/api/orders/123/start-picking', { method: 'POST', cookie: 'access_token=validtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(403);
    });

    it('POST /api/orders/123/start-picking with STAFF JWT returns 200', async () => {
        mockVerify.mockResolvedValue(STAFF_SESSION);
        const req = makeReq('/api/orders/123/start-picking', { method: 'POST', cookie: 'access_token=validtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(200);
    });

    it('POST /api/orders/123/start-picking with ADMIN JWT returns 200', async () => {
        mockVerify.mockResolvedValue(ADMIN_SESSION);
        const req = makeReq('/api/orders/123/start-picking', { method: 'POST', cookie: 'access_token=validtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(200);
    });

    it('PATCH /api/orders/123/items with CUSTOMER JWT returns 403', async () => {
        mockVerify.mockResolvedValue(CUSTOMER_SESSION);
        const req = makeReq('/api/orders/123/items', { method: 'PATCH', cookie: 'access_token=validtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(403);
    });

    it('PATCH /api/orders/123/items with STAFF JWT returns 200', async () => {
        mockVerify.mockResolvedValue(STAFF_SESSION);
        const req = makeReq('/api/orders/123/items', { method: 'PATCH', cookie: 'access_token=validtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(200);
    });

    it('spoofed x-user-id header is stripped — without cookie gets 401', async () => {
        const req = makeReq('/api/orders', { headers: { 'x-user-id': 'attacker-id' } });
        const res = await proxy(req);
        expect(res.status).toBe(401);
        expect(mockVerify).not.toHaveBeenCalled();
    });

    describe('internal jobs auth', () => {
        const JOB_PATH = '/api/internal/jobs/process-outbox';

        it('valid secret passes through (200)', async () => {
            process.env.INTERNAL_JOB_SECRET = 'test-secret';
            const req = makeReq(JOB_PATH, { headers: { authorization: 'Bearer test-secret' } });
            const res = await proxy(req);
            expect(res.status).toBe(200);
            expect(mockVerify).not.toHaveBeenCalled();
        });

        it('invalid secret returns 403', async () => {
            process.env.INTERNAL_JOB_SECRET = 'test-secret';
            const req = makeReq(JOB_PATH, { headers: { authorization: 'Bearer wrong-secret' } });
            const res = await proxy(req);
            expect(res.status).toBe(403);
            expect(mockVerify).not.toHaveBeenCalled();
        });

        it('missing INTERNAL_JOB_SECRET env returns 500', async () => {
            delete process.env.INTERNAL_JOB_SECRET;
            const req = makeReq(JOB_PATH, { headers: { authorization: 'Bearer any-secret' } });
            const res = await proxy(req);
            expect(res.status).toBe(500);
            expect(mockVerify).not.toHaveBeenCalled();
        });

        it('valid JWT ADMIN without Bearer secret returns 403', async () => {
            process.env.INTERNAL_JOB_SECRET = 'test-secret';
            mockVerify.mockResolvedValue(ADMIN_SESSION);
            const req = makeReq(JOB_PATH, { cookie: 'access_token=validtoken' });
            const res = await proxy(req);
            expect(res.status).toBe(403);
            expect(mockVerify).not.toHaveBeenCalled();
        });
    });
});
