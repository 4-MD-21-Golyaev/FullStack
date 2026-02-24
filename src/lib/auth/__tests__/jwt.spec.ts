import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SignJWT } from 'jose';
import { verifyJwt } from '../jwt';

function getSecret(): Uint8Array {
    return new TextEncoder().encode(process.env.JWT_SECRET!);
}

async function makeAccessToken(payload: { sub: string; role: string; email: string }, expiresIn = '15m'): Promise<string> {
    return new SignJWT({ role: payload.role, email: payload.email })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(payload.sub)
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(getSecret());
}

const validPayload = { sub: 'user-123', role: 'CUSTOMER', email: 'test@example.com' };

beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
});

describe('verifyJwt', () => {
    it('verifies a valid access token and returns payload', async () => {
        const token = await makeAccessToken(validPayload);
        const result = await verifyJwt(token);

        expect(result).not.toBeNull();
        expect(result!.sub).toBe(validPayload.sub);
        expect(result!.role).toBe(validPayload.role);
        expect(result!.email).toBe(validPayload.email);
    });

    it('returns null for an expired token', async () => {
        vi.useFakeTimers();

        const token = await makeAccessToken(validPayload, '15m');

        // Advance time past 15 minutes
        vi.advanceTimersByTime(16 * 60 * 1000);

        const result = await verifyJwt(token);
        expect(result).toBeNull();

        vi.useRealTimers();
    });

    it('returns null when verified with a different secret', async () => {
        const token = await makeAccessToken(validPayload);

        process.env.JWT_SECRET = 'different-secret-that-is-at-least-32-chars!!';

        const result = await verifyJwt(token);
        expect(result).toBeNull();
    });

    it('returns null for garbage input', async () => {
        const result = await verifyJwt('not.a.valid.jwt.token');
        expect(result).toBeNull();
    });
});
