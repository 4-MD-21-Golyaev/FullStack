import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/infrastructure/db/prismaClient', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
    },
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/infrastructure/db/prismaClient';

const mockUser = prisma.user as {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
};

function makeReq(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('POST /api/auth/register', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns 400 when email is missing', async () => {
        const res = await POST(makeReq({ phone: '+79991234567' }));
        expect(res.status).toBe(400);
    });

    it('returns 400 when phone is missing', async () => {
        const res = await POST(makeReq({ email: 'test@example.com' }));
        expect(res.status).toBe(400);
    });

    it('returns 409 when user with email already exists', async () => {
        mockUser.findUnique.mockResolvedValue({ id: 'existing-id', email: 'test@example.com' });
        const res = await POST(makeReq({ email: 'test@example.com', phone: '+79991234567' }));
        expect(res.status).toBe(409);
    });

    it('returns 201 with id and email on valid data', async () => {
        mockUser.findUnique.mockResolvedValue(null);
        mockUser.create.mockResolvedValue({ id: 'new-user-id', email: 'new@example.com', phone: '+79991234567' });

        const res = await POST(makeReq({ email: 'new@example.com', phone: '+79991234567' }));
        expect(res.status).toBe(201);

        const body = await res.json();
        expect(body).toMatchObject({ id: 'new-user-id', email: 'new@example.com' });
    });
});
