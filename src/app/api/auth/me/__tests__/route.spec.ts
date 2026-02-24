import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/application/auth/GetMeUseCase', () => {
    return {
        GetMeUseCase: class {
            execute = mockExecute;
        },
    };
});

vi.mock('@/infrastructure/repositories/UserRepository.prisma', () => ({
    PrismaUserRepository: class {},
}));

import { NextRequest } from 'next/server';
import { GET } from '../route';

function makeReq(headers?: Record<string, string>): NextRequest {
    return new NextRequest('http://localhost/api/auth/me', {
        method: 'GET',
        headers,
    });
}

describe('GET /api/auth/me', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns 401 when x-user-id header is missing', async () => {
        const res = await GET(makeReq());
        expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
        mockExecute.mockResolvedValue(null);

        const res = await GET(makeReq({ 'x-user-id': 'u1' }));
        expect(res.status).toBe(404);
    });

    it('returns 200 with user data when authenticated', async () => {
        mockExecute.mockResolvedValue({ id: 'u1', email: 'user@example.com', role: 'CUSTOMER', phone: '+7', address: null });

        const res = await GET(makeReq({ 'x-user-id': 'u1' }));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body).toEqual({ userId: 'u1', email: 'user@example.com', role: 'CUSTOMER' });
    });
});
