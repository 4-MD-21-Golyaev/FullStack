import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signJwt, verifyJwt, SessionPayload } from '../jwt';

const validPayload: SessionPayload = {
    sub: 'user-123',
    role: 'CUSTOMER',
    email: 'test@example.com',
};

beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
});

describe('signJwt / verifyJwt', () => {
    it('roundtrip: sign then verify returns the original payload', async () => {
        const token = await signJwt(validPayload);
        const result = await verifyJwt(token);

        expect(result).not.toBeNull();
        expect(result!.sub).toBe(validPayload.sub);
        expect(result!.role).toBe(validPayload.role);
        expect(result!.email).toBe(validPayload.email);
    });

    it('returns null for an expired token', async () => {
        vi.useFakeTimers();

        const token = await signJwt(validPayload);

        // Advance time past 7 days
        vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

        const result = await verifyJwt(token);
        expect(result).toBeNull();

        vi.useRealTimers();
    });

    it('returns null when verified with a different secret', async () => {
        const token = await signJwt(validPayload);

        process.env.JWT_SECRET = 'different-secret-that-is-at-least-32-chars!!';

        const result = await verifyJwt(token);
        expect(result).toBeNull();
    });

    it('returns null for garbage input', async () => {
        const result = await verifyJwt('not.a.valid.jwt.token');
        expect(result).toBeNull();
    });
});
