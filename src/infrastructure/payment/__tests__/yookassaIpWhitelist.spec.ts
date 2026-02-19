import { describe, it, expect } from 'vitest';
import { isYookassaIp } from '../yookassaIpWhitelist';

describe('isYookassaIp', () => {
    it('allows IPs from ЮKassa ranges', () => {
        expect(isYookassaIp('185.71.76.1')).toBe(true);
        expect(isYookassaIp('185.71.76.31')).toBe(true);
        expect(isYookassaIp('185.71.77.5')).toBe(true);
        expect(isYookassaIp('77.75.153.100')).toBe(true);
        expect(isYookassaIp('77.75.156.11')).toBe(true);
        expect(isYookassaIp('77.75.156.35')).toBe(true);
    });

    it('rejects IPs outside ЮKassa ranges', () => {
        expect(isYookassaIp('1.2.3.4')).toBe(false);
        expect(isYookassaIp('185.71.78.1')).toBe(false);
        expect(isYookassaIp('77.75.156.10')).toBe(false);
        expect(isYookassaIp('127.0.0.1')).toBe(false);
    });
});
