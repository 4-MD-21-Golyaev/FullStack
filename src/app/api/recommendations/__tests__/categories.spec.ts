import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/cache', () => ({
    unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
    revalidateTag: vi.fn(),
}));

const mockTopExecute = vi.fn();
const mockAffinityExecute = vi.fn();
const mockFindAll = vi.fn();

vi.mock('@/application/recommendation/GetTopCategoriesUseCase', () => ({
    GetTopCategoriesUseCase: class {
        execute = mockTopExecute;
    },
}));

vi.mock('@/application/recommendation/GetUserCategoryAffinityUseCase', () => ({
    GetUserCategoryAffinityUseCase: class {
        execute = mockAffinityExecute;
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
import { GET } from '../categories/route';

function makeReq(query: string = '', headers?: Record<string, string>): NextRequest {
    return new NextRequest(`http://localhost/api/recommendations/categories${query}`, {
        method: 'GET',
        headers: headers ?? {},
    });
}

describe('GET /api/recommendations/categories', () => {
    beforeEach(() => {
        mockTopExecute.mockReset();
        mockAffinityExecute.mockReset();
        mockFindAll.mockReset();
    });

    it('returns 200 for guest using global top use case', async () => {
        mockTopExecute.mockResolvedValue([{ categoryId: 'c1', orderCount: 5, score: 5 }]);
        mockFindAll.mockResolvedValue([{ id: 'c1', name: 'Cat 1', imagePath: null, parentId: null }]);

        const res = await GET(makeReq('?limit=10'));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.items).toHaveLength(1);
        expect(body.personalized).toBe(false);
        expect(body.fallbackUsed).toBe(false);
        expect(mockTopExecute).toHaveBeenCalledWith(10);
        expect(mockAffinityExecute).not.toHaveBeenCalled();
    });

    it('returns 200 with personalized:true for authenticated user with history', async () => {
        mockAffinityExecute.mockResolvedValue({
            items: [{ categoryId: 'c1', orderCount: 5, score: 5 }],
            personalized: true,
        });
        mockFindAll.mockResolvedValue([{ id: 'c1', name: 'Cat 1', imagePath: null, parentId: null }]);

        const res = await GET(makeReq('', { 'x-user-id': 'user-1' }));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.personalized).toBe(true);
        expect(body.fallbackUsed).toBe(false);
        expect(mockAffinityExecute).toHaveBeenCalledWith('user-1', 20);
    });

    it('returns 200 with personalized:false + fallbackUsed:true when affinity returns global fallback', async () => {
        mockAffinityExecute.mockResolvedValue({
            items: [{ categoryId: 'c1', orderCount: 50, score: 50 }],
            personalized: false,
        });
        mockFindAll.mockResolvedValue([{ id: 'c1', name: 'Cat 1', imagePath: null, parentId: null }]);

        const res = await GET(makeReq('', { 'x-user-id': 'new-user' }));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.personalized).toBe(false);
        expect(body.fallbackUsed).toBe(true);
    });

    it('returns 200 with empty items when no data', async () => {
        mockTopExecute.mockResolvedValue([]);

        const res = await GET(makeReq());

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.items).toEqual([]);
        expect(body.personalized).toBe(false);
        expect(body.fallbackUsed).toBe(false);
    });

    it('clamps limit to MAX_LIMIT (50)', async () => {
        mockTopExecute.mockResolvedValue([]);

        await GET(makeReq('?limit=999'));

        expect(mockTopExecute).toHaveBeenCalledWith(50);
    });

    it('uses DEFAULT_LIMIT (20) when limit is missing', async () => {
        mockTopExecute.mockResolvedValue([]);

        await GET(makeReq());

        expect(mockTopExecute).toHaveBeenCalledWith(20);
    });
});
