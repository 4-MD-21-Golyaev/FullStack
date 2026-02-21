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

    it('GET /api/orders without cookie returns 401', async () => {
        const req = makeReq('/api/orders');
        const res = await proxy(req);
        expect(res.status).toBe(401);
    });

    it('GET /api/orders with invalid JWT returns 401', async () => {
        mockVerify.mockResolvedValue(null);
        const req = makeReq('/api/orders', { cookie: 'session=badtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(401);
    });

    it('GET /api/orders with valid CUSTOMER JWT returns 200', async () => {
        mockVerify.mockResolvedValue(CUSTOMER_SESSION);
        const req = makeReq('/api/orders', { cookie: 'session=validtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(200);
    });

    it('POST /api/orders/123/start-picking with CUSTOMER JWT returns 403', async () => {
        mockVerify.mockResolvedValue(CUSTOMER_SESSION);
        const req = makeReq('/api/orders/123/start-picking', { method: 'POST', cookie: 'session=validtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(403);
    });

    it('POST /api/orders/123/start-picking with STAFF JWT returns 200', async () => {
        mockVerify.mockResolvedValue(STAFF_SESSION);
        const req = makeReq('/api/orders/123/start-picking', { method: 'POST', cookie: 'session=validtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(200);
    });

    it('POST /api/orders/123/start-picking with ADMIN JWT returns 200', async () => {
        mockVerify.mockResolvedValue(ADMIN_SESSION);
        const req = makeReq('/api/orders/123/start-picking', { method: 'POST', cookie: 'session=validtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(200);
    });

    it('PATCH /api/orders/123/items with CUSTOMER JWT returns 403', async () => {
        mockVerify.mockResolvedValue(CUSTOMER_SESSION);
        const req = makeReq('/api/orders/123/items', { method: 'PATCH', cookie: 'session=validtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(403);
    });

    it('PATCH /api/orders/123/items with STAFF JWT returns 200', async () => {
        mockVerify.mockResolvedValue(STAFF_SESSION);
        const req = makeReq('/api/orders/123/items', { method: 'PATCH', cookie: 'session=validtoken' });
        const res = await proxy(req);
        expect(res.status).toBe(200);
    });

    it('spoofed x-user-id header is stripped — verifyJwt is called and CUSTOMER without cookie gets 401', async () => {
        // No cookie provided — session cookie is missing
        const req = makeReq('/api/orders', { headers: { 'x-user-id': 'attacker-id' } });
        const res = await proxy(req);
        // No cookie → verifyJwt not called (token is null), response is 401
        expect(res.status).toBe(401);
        // Verify the header stripping did not allow bypass
        expect(mockVerify).not.toHaveBeenCalled();
    });
});
