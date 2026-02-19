import { NextRequest } from 'next/server';

// Актуальный список IP ЮKassa: https://yookassa.ru/developers/using-api/webhooks
const YOOKASSA_CIDRS = [
    '185.71.76.0/27',
    '185.71.77.0/27',
    '77.75.153.0/25',
    '77.75.156.11/32',
    '77.75.156.35/32',
];

function ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function isInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = bits === '32' ? 0xffffffff : (~0 << (32 - parseInt(bits))) >>> 0;
    return (ipToNumber(ip) & mask) === (ipToNumber(range) & mask);
}

export function isYookassaIp(ip: string): boolean {
    return YOOKASSA_CIDRS.some(cidr => isInCidr(ip, cidr));
}

export function getClientIp(req: NextRequest): string | null {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers.get('x-real-ip');
}
