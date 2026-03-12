import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('@/application/order/ConfirmPaymentUseCase', () => ({
    ConfirmPaymentUseCase: class { execute = mockExecute; },
}));
vi.mock('@/infrastructure/repositories/PaymentRepository.prisma', () => ({
    PrismaPaymentRepository: class {},
}));
vi.mock('@/infrastructure/db/PrismaTransactionRunner', () => ({
    PrismaTransactionRunner: class {},
}));
vi.mock('@/infrastructure/payment/yookassaIpWhitelist', () => ({
    isYookassaIp: vi.fn().mockReturnValue(true),
    getClientIp: vi.fn().mockReturnValue('185.71.76.0'),
}));
vi.mock('@/infrastructure/payment/YookassaGateway', () => ({
    YookassaGateway: class { refundPayment = vi.fn(); createPayment = vi.fn(); },
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';

function makeReq(body: object): NextRequest {
    return new NextRequest('http://localhost/api/webhooks/yookassa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const succeededBody = {
    event: 'payment.succeeded',
    object: { id: 'ext-1', status: 'succeeded' },
};

const canceledBody = {
    event: 'payment.canceled',
    object: { id: 'ext-1', status: 'canceled' },
};

describe('POST /api/webhooks/yookassa', () => {
    beforeEach(() => vi.resetAllMocks());

    it('returns 200 for successful payment.succeeded processing', async () => {
        mockExecute.mockResolvedValue({ alreadyProcessed: false });
        const res = await POST(makeReq(succeededBody));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
    });

    it('returns 200 for idempotent repeat webhook (alreadyProcessed: true)', async () => {
        mockExecute.mockResolvedValue({ alreadyProcessed: true });
        const res = await POST(makeReq(succeededBody));
        expect(res.status).toBe(200);
    });

    it('returns 200 for payment.canceled', async () => {
        mockExecute.mockResolvedValue({ alreadyProcessed: false });
        const res = await POST(makeReq(canceledBody));
        expect(res.status).toBe(200);
    });

    it('returns 200 for unknown event type (ignored)', async () => {
        const res = await POST(makeReq({ event: 'payment.refunded', object: { id: 'ext-1' } }));
        expect(res.status).toBe(200);
        expect(mockExecute).not.toHaveBeenCalled();
    });

    it('returns 200 for domain error like "Payment not found" (non-retryable)', async () => {
        mockExecute.mockRejectedValue(new Error('Payment with externalId "ext-1" not found'));
        const res = await POST(makeReq(succeededBody));
        expect(res.status).toBe(200);
    });

    it('returns 503 for Prisma DB error (retryable — YooKassa should retry)', async () => {
        const dbError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
        mockExecute.mockRejectedValue(dbError);
        const res = await POST(makeReq(succeededBody));
        expect(res.status).toBe(503);
    });

    it('returns 503 for PrismaClientInitializationError (retryable)', async () => {
        const initError = Object.assign(new Error('DB connection refused'), {
            name: 'PrismaClientInitializationError',
        });
        mockExecute.mockRejectedValue(initError);
        const res = await POST(makeReq(succeededBody));
        expect(res.status).toBe(503);
    });

    it('returns 400 for invalid JSON body', async () => {
        const req = new NextRequest('http://localhost/api/webhooks/yookassa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'not-json',
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('second identical webhook is idempotent (no duplicate processing)', async () => {
        mockExecute
            .mockResolvedValueOnce({ alreadyProcessed: false })  // first call
            .mockResolvedValueOnce({ alreadyProcessed: true });   // second call

        const res1 = await POST(makeReq(succeededBody));
        const res2 = await POST(makeReq(succeededBody));

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);
        expect(mockExecute).toHaveBeenCalledTimes(2);
    });
});
