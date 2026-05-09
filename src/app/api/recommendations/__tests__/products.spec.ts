import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/cache', () => ({
    unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
    revalidateTag: vi.fn(),
}));

const mockGlobalExecute = vi.fn();
const mockUserExecute = vi.fn();
const mockFindByIds = vi.fn();
const mockFindAll = vi.fn();

vi.mock('@/application/recommendation/GetGlobalPopularProductsUseCase', () => ({
    GetGlobalPopularProductsUseCase: class {
        execute = mockGlobalExecute;
    },
}));

vi.mock('@/application/recommendation/GetUserPopularProductsUseCase', () => ({
    GetUserPopularProductsUseCase: class {
        execute = mockUserExecute;
    },
}));

vi.mock('@/infrastructure/repositories/ProductRepository.prisma', () => ({
    PrismaProductRepository: class {
        findByIds = mockFindByIds;
    },
}));

vi.mock('@/infrastructure/repositories/CategoryRepository.prisma', () => ({
    PrismaCategoryRepository: class {
        findAll = mockFindAll;
    },
}));

vi.mock('@/infrastructure/repositories/ProductRecommendationRepository.prisma', () => ({
    PrismaProductRecommendationRepository: class {},
}));

import { NextRequest } from 'next/server';
import { GET } from '../products/route';

function makeReq(query: string = '', headers?: Record<string, string>): NextRequest {
    return new NextRequest(`http://localhost/api/recommendations/products${query}`, {
        method: 'GET',
        headers: headers ?? {},
    });
}

describe('GET /api/recommendations/products', () => {
    beforeEach(() => {
        mockGlobalExecute.mockReset();
        mockUserExecute.mockReset();
        mockFindByIds.mockReset();
        mockFindAll.mockReset();
    });

    it('returns 200 for guest using global use case (no categoryId, no expansion)', async () => {
        mockGlobalExecute.mockResolvedValue([{ productId: 'p1', orderCount: 5, quantitySum: 10, score: 5 }]);
        mockFindByIds.mockResolvedValue([
            { id: 'p1', name: 'Prod', article: 'A', price: 100, stock: 1, imagePath: null, categoryId: 'c1' },
        ]);

        const res = await GET(makeReq('?limit=5'));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.items).toHaveLength(1);
        expect(body.personalized).toBe(false);
        expect(body.fallbackUsed).toBe(false);
        expect(mockGlobalExecute).toHaveBeenCalledWith({ categoryIds: undefined, limit: 5 });
        expect(mockFindAll).not.toHaveBeenCalled();
    });

    it('returns 200 for authenticated user; mirrors fallbackUsed/personalized from use case', async () => {
        mockUserExecute.mockResolvedValue({
            items: [{ productId: 'p1', orderCount: 5, quantitySum: 10, score: 5 }],
            personalized: true,
            fallbackUsed: false,
        });
        mockFindByIds.mockResolvedValue([
            { id: 'p1', name: 'Prod', article: 'A', price: 100, stock: 1, imagePath: null, categoryId: 'c1' },
        ]);

        const res = await GET(makeReq('', { 'x-user-id': 'user-1' }));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.personalized).toBe(true);
        expect(body.fallbackUsed).toBe(false);
        expect(mockUserExecute).toHaveBeenCalledWith('user-1', null, 20);
    });

    it('returns 200 with empty items when no popular products', async () => {
        mockGlobalExecute.mockResolvedValue([]);

        const res = await GET(makeReq());

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.items).toEqual([]);
        expect(body.personalized).toBe(false);
        expect(body.fallbackUsed).toBe(false);
        expect(mockFindByIds).not.toHaveBeenCalled();
    });

    it('expands categoryId for guest via CategoryRepository.findAll + collectDescendantIds', async () => {
        mockFindAll.mockResolvedValue([
            { id: 'root', name: 'root', imagePath: null, parentId: null },
            { id: 'a', name: 'a', imagePath: null, parentId: 'root' },
        ]);
        mockGlobalExecute.mockResolvedValue([]);

        await GET(makeReq('?categoryId=root'));

        expect(mockFindAll).toHaveBeenCalledTimes(1);
        const call = mockGlobalExecute.mock.calls[0][0];
        expect(call.categoryIds.sort()).toEqual(['a', 'root']);
    });

    it('clamps limit to MAX_LIMIT (50)', async () => {
        mockGlobalExecute.mockResolvedValue([]);

        await GET(makeReq('?limit=9999'));

        const call = mockGlobalExecute.mock.calls[0][0];
        expect(call.limit).toBe(50);
    });

    it('uses DEFAULT_LIMIT (20) when limit is missing', async () => {
        mockGlobalExecute.mockResolvedValue([]);

        await GET(makeReq());

        const call = mockGlobalExecute.mock.calls[0][0];
        expect(call.limit).toBe(20);
    });
});
