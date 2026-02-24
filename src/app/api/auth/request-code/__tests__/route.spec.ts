import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/application/auth/RequestCodeUseCase', () => ({
    RequestCodeUseCase: class { execute = mockExecute; },
}));

vi.mock('@/infrastructure/repositories/OtpRepository.prisma', () => ({
    PrismaOtpRepository: class {},
}));

vi.mock('@/infrastructure/auth/NodemailerEmailGateway', () => ({
    NodemailerEmailGateway: class {},
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';

function makeReq(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/auth/request-code', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('POST /api/auth/request-code', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns 400 when email is missing', async () => {
        const res = await POST(makeReq({}));
        expect(res.status).toBe(400);
    });

    it('returns 200 with code in development', async () => {
        mockExecute.mockResolvedValue({ ok: true, code: '123456' });

        const res = await POST(makeReq({ email: 'user@example.com' }));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.code).toBe('123456');
    });

    it('returns 200 without code in production', async () => {
        mockExecute.mockResolvedValue({ ok: true });

        const res = await POST(makeReq({ email: 'user@example.com' }));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body).not.toHaveProperty('code');
    });
});
