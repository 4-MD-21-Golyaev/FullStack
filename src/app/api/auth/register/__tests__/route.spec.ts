import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/application/auth/RegisterUseCase', () => ({
    RegisterUseCase: class { execute = mockExecute; },
}));

vi.mock('@/infrastructure/repositories/UserRepository.prisma', () => ({
    PrismaUserRepository: class {},
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { UserAlreadyExistsError } from '@/domain/auth/errors';

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

    it('returns 409 when user already exists', async () => {
        mockExecute.mockRejectedValue(new UserAlreadyExistsError('test@example.com'));
        const res = await POST(makeReq({ email: 'test@example.com', phone: '+79991234567' }));
        expect(res.status).toBe(409);
    });

    it('returns 201 with id and email on success', async () => {
        mockExecute.mockResolvedValue({ id: 'new-user-id', email: 'new@example.com' });

        const res = await POST(makeReq({ email: 'new@example.com', phone: '+79991234567' }));
        expect(res.status).toBe(201);

        const body = await res.json();
        expect(body).toMatchObject({ id: 'new-user-id', email: 'new@example.com' });
    });
});
