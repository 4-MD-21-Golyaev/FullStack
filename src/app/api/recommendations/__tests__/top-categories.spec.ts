import { describe, it, expect, vi, beforeEach } from 'vitest';

// Make unstable_cache a passthrough so the inner function actually runs.
vi.mock('next/cache', () => ({
    unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
    revalidateTag: vi.fn(),
}));

const mockExecute = vi.fn();
const mockFindAll = vi.fn();

vi.mock('@/application/recommendation/GetTopCategoriesUseCase', () => ({
    GetTopCategoriesUseCase: class {
        execute = mockExecute;
    },
}));

vi.mock('@/infrastructure/repositories/CategoryRepository.prisma', () => ({
    PrismaCategoryRepository: class {
        findAll = mockFindAll;
    },
}));

vi.mock('@/infrastructure/repositories/CategoryRecommendationRepository.prisma', () => ({
    PrismaCategoryRecommendationRepository: class {},
}));

import { NextRequest } from 'next/server';
import { GET } from '../top-categories/route';

function makeReq(query: string = '', headers?: Record<string, string>): NextRequest {
    return new NextRequest(`http://localhost/api/recommendations/top-categories${query}`, {
        method: 'GET',
        headers: headers ?? {},
    });
}

describe('GET /api/recommendations/top-categories', () => {
    beforeEach(() => {
        mockExecute.mockReset();
        mockFindAll.mockReset();
    });

    it('returns 200 for guest with enriched items', async () => {
        mockExecute.mockResolvedValue([
            { categoryId: 'c1', orderCount: 5, score: 5 },
            { categoryId: 'c2', orderCount: 3, score: 3 },
        ]);
        mockFindAll.mockResolvedValue([
            { id: 'c1', name: 'Cat 1', imagePath: null, parentId: null },
            { id: 'c2', name: 'Cat 2', imagePath: null, parentId: null },
        ]);

        const res = await GET(makeReq('?limit=3'));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.items).toHaveLength(2);
        expect(body.personalized).toBe(false);
        expect(body.fallbackUsed).toBe(false);
        expect(mockExecute).toHaveBeenCalledWith(3);
    });

    it('returns 200 with empty items when no popular categories', async () => {
        mockExecute.mockResolvedValue([]);

        const res = await GET(makeReq());

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.items).toEqual([]);
        expect(body.personalized).toBe(false);
        expect(body.fallbackUsed).toBe(false);
    });

    it('clamps limit to MAX_LIMIT (12)', async () => {
        mockExecute.mockResolvedValue([]);

        await GET(makeReq('?limit=999'));

        expect(mockExecute).toHaveBeenCalledWith(12);
    });

    it('uses DEFAULT_LIMIT (3) when limit is missing', async () => {
        mockExecute.mockResolvedValue([]);

        await GET(makeReq());

        expect(mockExecute).toHaveBeenCalledWith(3);
    });

    it('uses DEFAULT_LIMIT when limit is not a number', async () => {
        mockExecute.mockResolvedValue([]);

        await GET(makeReq('?limit=notanumber'));

        expect(mockExecute).toHaveBeenCalledWith(3);
    });
});
