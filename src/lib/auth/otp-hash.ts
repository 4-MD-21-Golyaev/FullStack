import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Compute HMAC-SHA256 of the OTP code, keyed by OTP_HMAC_SECRET + email context.
 * Email is included in the HMAC message to make codes non-transferable between accounts.
 */
export function hashOtpCode(code: string, email: string): string {
    const secret = process.env.OTP_HMAC_SECRET ?? 'dev-otp-secret-change-in-production';
    return createHmac('sha256', secret).update(`${email.toLowerCase()}:${code}`).digest('hex');
}

/** Timing-safe comparison of two hex HMAC strings. */
export function compareOtpHashes(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
