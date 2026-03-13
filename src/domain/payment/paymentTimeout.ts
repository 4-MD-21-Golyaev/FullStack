export const PAYMENT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function isPaymentWindowExpired(paymentStartedAt: Date): boolean {
    return Date.now() - paymentStartedAt.getTime() > PAYMENT_TIMEOUT_MS;
}
