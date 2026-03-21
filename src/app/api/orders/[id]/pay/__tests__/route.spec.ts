import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindById = vi.fn();
const mockExecute = vi.fn();

vi.mock('@/infrastructure/repositories/OrderRepository.prisma', () => ({
    PrismaOrderRepository: class {
        findById = mockFindById;
    },
}));

vi.mock('@/infrastructure/repositories/PaymentRepository.prisma', () => ({
    PrismaPaymentRepository: class {},
}));

vi.mock('@/infrastructure/db/PrismaTransactionRunner', () => ({
    PrismaTransactionRunner: class {},
}));

vi.mock('@/infrastructure/payment/YookassaGateway', () => ({
    YookassaGateway: class {},
}));

vi.mock('@/application/order/InitiatePaymentUseCase', () => ({
    InitiatePaymentUseCase: class {
        execute = mockExecute;
    },
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';

const ORDER_ID = 'order-1';
const OWNER_ID = 'user-owner';
const OTHER_ID = 'user-other';

const mockOrder = { id: ORDER_ID, userId: OWNER_ID };
const routeParams = { params: Promise.resolve({ id: ORDER_ID }) };

function makeReq(headers?: Record<string, string>): NextRequest {
    return new NextRequest(`http://localhost/api/orders/${ORDER_ID}/pay`, {
        method: 'POST',
        headers,
    });
}

describe('POST /api/orders/[id]/pay', () => {
    beforeEach(() => vi.resetAllMocks());

    it('returns 401 when x-user-id is missing', async () => {
        const res = await POST(makeReq(), routeParams);
        expect(res.status).toBe(401);
        expect(mockExecute).not.toHaveBeenCalled();
    });

    it('returns 404 when order does not exist', async () => {
        mockFindById.mockResolvedValue(null);
        const res = await POST(
            makeReq({ 'x-user-id': OWNER_ID, 'x-user-role': 'CUSTOMER' }),
            routeParams,
        );
        expect(res.status).toBe(404);
        expect(mockExecute).not.toHaveBeenCalled();
    });

    it('returns 403 when CUSTOMER tries to pay another user\'s order', async () => {
        mockFindById.mockResolvedValue(mockOrder);
        const res = await POST(
            makeReq({ 'x-user-id': OTHER_ID, 'x-user-role': 'CUSTOMER' }),
            routeParams,
        );
        expect(res.status).toBe(403);
        expect(mockExecute).not.toHaveBeenCalled();
    });

    it('CUSTOMER can pay their own order', async () => {
        mockFindById.mockResolvedValue(mockOrder);
        mockExecute.mockResolvedValue({ confirmationUrl: 'https://yookassa.ru/pay/123' });
        const res = await POST(
            makeReq({ 'x-user-id': OWNER_ID, 'x-user-role': 'CUSTOMER' }),
            routeParams,
        );
        expect(res.status).toBe(200);
        expect(mockExecute).toHaveBeenCalledOnce();
        const body = await res.json();
        expect(body.confirmationUrl).toBe('https://yookassa.ru/pay/123');
    });

    it('STAFF can pay any order regardless of ownership', async () => {
        mockFindById.mockResolvedValue(mockOrder);
        mockExecute.mockResolvedValue({ confirmationUrl: 'https://yookassa.ru/pay/123' });
        const res = await POST(
            makeReq({ 'x-user-id': 'staff-1', 'x-user-role': 'STAFF' }),
            routeParams,
        );
        expect(res.status).toBe(200);
        expect(mockExecute).toHaveBeenCalledOnce();
    });

    it('ADMIN can pay any order regardless of ownership', async () => {
        mockFindById.mockResolvedValue(mockOrder);
        mockExecute.mockResolvedValue({ confirmationUrl: 'https://yookassa.ru/pay/123' });
        const res = await POST(
            makeReq({ 'x-user-id': 'admin-1', 'x-user-role': 'ADMIN' }),
            routeParams,
        );
        expect(res.status).toBe(200);
        expect(mockExecute).toHaveBeenCalledOnce();
    });

    it('returns 400 when use case throws a business error', async () => {
        mockFindById.mockResolvedValue(mockOrder);
        mockExecute.mockRejectedValue(new Error('Order is not in PAYMENT state'));
        const res = await POST(
            makeReq({ 'x-user-id': OWNER_ID, 'x-user-role': 'CUSTOMER' }),
            routeParams,
        );
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe('Order is not in PAYMENT state');
    });

});
