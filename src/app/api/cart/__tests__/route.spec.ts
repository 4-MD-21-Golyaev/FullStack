import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetExecute = vi.fn();
const mockAddExecute = vi.fn();

vi.mock('@/application/cart/GetCartUseCase', () => ({
    GetCartUseCase: class {
        execute = mockGetExecute;
    },
}));

vi.mock('@/application/cart/AddToCartUseCase', () => ({
    AddToCartUseCase: class {
        execute = mockAddExecute;
    },
}));

vi.mock('@/infrastructure/repositories/CartRepository.prisma', () => ({
    PrismaCartRepository: class {},
}));

vi.mock('@/infrastructure/repositories/ProductRepository.prisma', () => ({
    PrismaProductRepository: class {},
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';

function makePostReq(body: unknown, headers?: Record<string, string>): NextRequest {
    return new NextRequest('http://localhost/api/cart', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
    });
}

describe('POST /api/cart', () => {
    beforeEach(() => vi.resetAllMocks());

    it('returns 401 when x-user-id header is missing', async () => {
        const res = await POST(makePostReq({ productId: 'p1', quantity: 1 }));
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.message).toBe('Unauthorized');
        expect(mockAddExecute).not.toHaveBeenCalled();
        expect(mockGetExecute).not.toHaveBeenCalled();
    });

    it('returns 201 with enriched cart array on happy path', async () => {
        const enriched = [
            {
                productId: 'p1',
                name: 'Widget',
                article: 'W-001',
                price: 150,
                stock: 5,
                imagePath: '/img/widget.png',
                quantity: 2,
            },
        ];
        mockAddExecute.mockResolvedValue(undefined);
        mockGetExecute.mockResolvedValue(enriched);

        const res = await POST(
            makePostReq({ productId: 'p1', quantity: 2 }, { 'x-user-id': 'u1' }),
        );

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
            productId: 'p1',
            name: 'Widget',
            price: 150,
            imagePath: '/img/widget.png',
            stock: 5,
            quantity: 2,
        });
        expect(mockAddExecute).toHaveBeenCalledWith({
            userId: 'u1',
            productId: 'p1',
            quantity: 2,
        });
        expect(mockGetExecute).toHaveBeenCalledWith('u1');
    });

    it('returns 400 when quantity is not positive (use case throws)', async () => {
        mockAddExecute.mockRejectedValue(new Error('Quantity must be positive'));

        const res = await POST(
            makePostReq({ productId: 'p1', quantity: 0 }, { 'x-user-id': 'u1' }),
        );

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe('Quantity must be positive');
        expect(mockGetExecute).not.toHaveBeenCalled();
    });

    it('returns 400 when product is not found (use case throws)', async () => {
        mockAddExecute.mockRejectedValue(new Error('Product p1 not found'));

        const res = await POST(
            makePostReq({ productId: 'p1', quantity: 1 }, { 'x-user-id': 'u1' }),
        );

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe('Product p1 not found');
        expect(mockGetExecute).not.toHaveBeenCalled();
    });

    it('returns 400 when stock is insufficient (use case throws)', async () => {
        mockAddExecute.mockRejectedValue(new Error('Insufficient stock'));

        const res = await POST(
            makePostReq({ productId: 'p1', quantity: 999 }, { 'x-user-id': 'u1' }),
        );

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe('Insufficient stock');
        expect(mockGetExecute).not.toHaveBeenCalled();
    });
});
