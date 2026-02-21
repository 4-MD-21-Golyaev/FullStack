import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
    getSession: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getSession } from '@/lib/auth/session';

const mockGetSession = getSession as ReturnType<typeof vi.fn>;

function makeReq(): NextRequest {
    return new NextRequest('http://localhost/api/auth/me', { method: 'GET' });
}

describe('GET /api/auth/me', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns 401 when session is null', async () => {
        mockGetSession.mockResolvedValue(null);

        const res = await GET(makeReq());
        expect(res.status).toBe(401);
    });

    it('returns 200 with userId, email, role when session exists', async () => {
        mockGetSession.mockResolvedValue({ sub: 'user-1', email: 'user@example.com', role: 'CUSTOMER' });

        const res = await GET(makeReq());
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body).toEqual({ userId: 'user-1', email: 'user@example.com', role: 'CUSTOMER' });
    });
});
