import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/auth/otp', () => ({
    createOtpInDB: vi.fn(),
}));

vi.mock('@/lib/auth/email', () => ({
    sendOtpEmail: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { createOtpInDB } from '@/lib/auth/otp';
import { sendOtpEmail } from '@/lib/auth/email';

const mockCreateOtp = createOtpInDB as ReturnType<typeof vi.fn>;
const mockSendEmail = sendOtpEmail as ReturnType<typeof vi.fn>;

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
        mockSendEmail.mockResolvedValue(undefined);
    });

    it('returns 400 when email is missing', async () => {
        const res = await POST(makeReq({}));
        expect(res.status).toBe(400);
    });

    it('returns 200 with code in development', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        mockCreateOtp.mockResolvedValue('123456');

        const res = await POST(makeReq({ email: 'user@example.com' }));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.code).toBe('123456');

        vi.unstubAllEnvs();
    });

    it('returns 200 without code in production', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        mockCreateOtp.mockResolvedValue('654321');

        const res = await POST(makeReq({ email: 'user@example.com' }));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body).not.toHaveProperty('code');
        expect(body.ok).toBe(true);

        vi.unstubAllEnvs();
    });

    it('calls sendOtpEmail with email and code (fire-and-forget)', async () => {
        mockCreateOtp.mockResolvedValue('111222');

        await POST(makeReq({ email: 'user@example.com' }));

        // Allow microtasks to flush so fire-and-forget resolves
        await Promise.resolve();

        expect(mockSendEmail).toHaveBeenCalledWith('user@example.com', '111222');
    });
});
