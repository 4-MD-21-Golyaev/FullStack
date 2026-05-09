import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/cache', () => ({
    unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
    revalidateTag: vi.fn(),
}));

const mockExecute = vi.fn();
const mockFindByIds = vi.fn();

vi.mock('@/application/recommendation/GetRelatedProductsUseCase', () => ({
    GetRelatedProductsUseCase: class {
        execute = mockExecute;
    },
}));

vi.mock('@/application/recommendation/GetGlobalPopularProductsUseCase', () => ({
    GetGlobalPopularProductsUseCase: class {},
}));

vi.mock('@/infrastructure/repositories/ProductRepository.prisma', () => ({
    PrismaProductRepository: class {
        findByIds = mockFindByIds;
    },
}));

vi.mock('@/infrastructure/repositories/ProductRecommendationRepository.prisma', () => ({
    PrismaProductRecommendationRepository: class {},
}));

import { NextRequest } from 'next/server';
import { GET } from '../related/route';

function makeReq(query: string = '', headers?: Record<string, string>): NextRequest {
    return new NextRequest(`http://localhost/api/recommendations/related${query}`, {
        method: 'GET',
        headers: headers ?? {},
    });
}

describe('GET /api/recommendations/related', () => {
    beforeEach(() => {
        mockExecute.mockReset();
        mockFindByIds.mockReset();
    });

    it('returns 400 when productId is missing', async () => {
        const res = await GET(makeReq());

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toBe('productId is required');
        expect(mockExecute).not.toHaveBeenCalled();
    });

    it('returns 200 for guest with related items', async () => {
        mockExecute.mockResolvedValue({
            items: [
                { productId: 'p1', coOccurrenceCount: 5, jaccardScore: 0.5 },
                { productId: 'p2', coOccurrenceCount: 3, jaccardScore: 0.3 },
            ],
            fallbackUsed: false,
        });
        mockFindByIds.mockResolvedValue([
            { id: 'p1', name: 'P1', article: 'a1', price: 1, stock: 1, imagePath: null, categoryId: 'c1' },
            { id: 'p2', name: 'P2', article: 'a2', price: 1, stock: 1, imagePath: null, categoryId: 'c1' },
        ]);

        const res = await GET(makeReq('?productId=seed&limit=6'));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.items).toHaveLength(2);
        expect(body.personalized).toBe(false);
        expect(body.fallbackUsed).toBe(false);
        expect(mockExecute).toHaveBeenCalledWith('seed', 6);
    });

    it('returns 200 for authenticated user (header is irrelevant for /related — same response shape)', async () => {
        mockExecute.mockResolvedValue({ items: [], fallbackUsed: false });

        const res = await GET(makeReq('?productId=seed', { 'x-user-id': 'user-1' }));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.items).toEqual([]);
        expect(body.personalized).toBe(false);
        expect(body.fallbackUsed).toBe(false);
    });

    it('returns 200 with empty items + fallbackUsed:true when use case signals fallback miss', async () => {
        mockExecute.mockResolvedValue({ items: [], fallbackUsed: true });

        const res = await GET(makeReq('?productId=missing'));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.items).toEqual([]);
        expect(body.personalized).toBe(false);
        expect(body.fallbackUsed).toBe(true);
    });

    it('clamps limit to MAX_LIMIT (24)', async () => {
        mockExecute.mockResolvedValue({ items: [], fallbackUsed: false });

        await GET(makeReq('?productId=seed&limit=999'));

        expect(mockExecute).toHaveBeenCalledWith('seed', 24);
    });

    it('uses DEFAULT_LIMIT (6) when limit is missing', async () => {
        mockExecute.mockResolvedValue({ items: [], fallbackUsed: false });

        await GET(makeReq('?productId=seed'));

        expect(mockExecute).toHaveBeenCalledWith('seed', 6);
    });
});
