import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { validateVkSignature } from '../vk-signature';

const SECRET = 'my-app-secret';

function buildQs(params: Record<string, string>, secret: string): string {
    const vkEntries = Object.entries(params)
        .filter(([k]) => k.startsWith('vk_'))
        .sort(([a], [b]) => a.localeCompare(b));

    const payload = vkEntries.map(([k, v]) => `${k}=${v}`).join('&');
    const sign = createHmac('sha256', secret).update(payload).digest('base64url');

    return new URLSearchParams({ ...params, sign }).toString();
}

describe('validateVkSignature', () => {
    it('returns true for a valid signature', () => {
        const qs = buildQs({ vk_user_id: '123', vk_app_id: '456', vk_platform: 'mobile' }, SECRET);
        expect(validateVkSignature(qs, SECRET)).toBe(true);
    });

    it('returns false when sign is missing', () => {
        expect(validateVkSignature('vk_user_id=123&vk_app_id=456', SECRET)).toBe(false);
    });

    it('returns false when sign is tampered', () => {
        const qs = buildQs({ vk_user_id: '123' }, SECRET) + '&tampered=1';
        // sign is still computed without the extra param but params are same → should still be valid
        // let's actually test with a bad sign value directly
        expect(validateVkSignature('vk_user_id=123&sign=invalidsignature', SECRET)).toBe(false);
    });

    it('returns false when signed with wrong secret', () => {
        const qs = buildQs({ vk_user_id: '123', vk_app_id: '456' }, 'wrong-secret');
        expect(validateVkSignature(qs, SECRET)).toBe(false);
    });

    it('ignores non-vk_ params when computing signature', () => {
        // Build a valid QS, then append a non-vk_ param — should still be valid
        const qs = buildQs({ vk_user_id: '99', vk_app_id: '1' }, SECRET);
        const withExtra = qs + '&utm_source=vk';
        expect(validateVkSignature(withExtra, SECRET)).toBe(true);
    });
});
