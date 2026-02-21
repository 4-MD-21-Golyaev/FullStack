import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
    clearSessionCookie: vi.fn(),
}));

import { POST } from '../route';
import { clearSessionCookie } from '@/lib/auth/session';

const mockClearCookie = clearSessionCookie as ReturnType<typeof vi.fn>;

describe('POST /api/auth/logout', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns 200 and calls clearSessionCookie', async () => {
        const res = await POST();
        expect(res.status).toBe(200);
        expect(mockClearCookie).toHaveBeenCalledOnce();
    });
});
