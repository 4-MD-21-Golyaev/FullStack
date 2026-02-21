import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/otp', () => ({
    verifyOtpInDB: vi.fn(),
}));

vi.mock('@/infrastructure/db/prismaClient', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock('@/lib/auth/jwt', () => ({
    signJwt: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
    setSessionCookie: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { verifyOtpInDB } from '@/lib/auth/otp';
import { prisma } from '@/infrastructure/db/prismaClient';
import { signJwt } from '@/lib/auth/jwt';
import { setSessionCookie } from '@/lib/auth/session';

const mockVerifyOtp = verifyOtpInDB as ReturnType<typeof vi.fn>;
const mockUser = prisma.user as { findUnique: ReturnType<typeof vi.fn> };
const mockSignJwt = signJwt as ReturnType<typeof vi.fn>;
const mockSetCookie = setSessionCookie as ReturnType<typeof vi.fn>;

function makeReq(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('POST /api/auth/verify-code', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns 400 when email is missing', async () => {
        const res = await POST(makeReq({ code: '123456' }));
        expect(res.status).toBe(400);
    });

    it('returns 400 when code is missing', async () => {
        const res = await POST(makeReq({ email: 'user@example.com' }));
        expect(res.status).toBe(400);
    });

    it('returns 401 for invalid or expired OTP', async () => {
        mockVerifyOtp.mockResolvedValue(false);

        const res = await POST(makeReq({ email: 'user@example.com', code: '000000' }));
        expect(res.status).toBe(401);
    });

    it('returns 404 when user not found in DB', async () => {
        mockVerifyOtp.mockResolvedValue(true);
        mockUser.findUnique.mockResolvedValue(null);

        const res = await POST(makeReq({ email: 'unknown@example.com', code: '123456' }));
        expect(res.status).toBe(404);
    });

    it('returns 200 and calls setSessionCookie on success', async () => {
        mockVerifyOtp.mockResolvedValue(true);
        mockUser.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com', role: 'CUSTOMER' });
        mockSignJwt.mockResolvedValue('signed.jwt.token');

        const res = await POST(makeReq({ email: 'user@example.com', code: '123456' }));
        expect(res.status).toBe(200);
        expect(mockSetCookie).toHaveBeenCalledWith(expect.anything(), 'signed.jwt.token');
    });
});
