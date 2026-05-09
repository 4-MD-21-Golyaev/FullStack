import { describe, it, expect, vi } from 'vitest';
import { GetGlobalPopularProductsUseCase } from '../GetGlobalPopularProductsUseCase';
import { type ProductRecommendationRepository } from '@/application/ports/ProductRecommendationRepository';
import { type PopularProduct } from '@/domain/recommendation/PopularProduct';
import { INCLUDED_ORDER_CODES } from '@/domain/recommendation/RecommendationStatusFilter';

function makeRepo(returns: PopularProduct[]) {
    return {
        findTopProductsForUser: vi.fn(),
        findTopProductsGlobal: vi.fn().mockResolvedValue(returns),
        findRelatedProductsJaccard: vi.fn(),
    } as unknown as ProductRecommendationRepository & {
        findTopProductsGlobal: ReturnType<typeof vi.fn>;
    };
}

describe('GetGlobalPopularProductsUseCase', () => {
    it('returns top global products and forwards options without categoryIds', async () => {
        const items: PopularProduct[] = [
            { productId: 'p1', orderCount: 10, quantitySum: 30, score: 8 },
        ];
        const repo = makeRepo(items);
        const useCase = new GetGlobalPopularProductsUseCase(repo);

        const result = await useCase.execute({ limit: 4 });

        expect(result).toEqual(items);
        expect(repo.findTopProductsGlobal).toHaveBeenCalledWith({
            categoryIds: undefined,
            limit: 4,
            statusCodes: INCLUDED_ORDER_CODES,
            withTimeDecay: true,
        });
    });

    it('forwards categoryIds when provided', async () => {
        const items: PopularProduct[] = [
            { productId: 'p2', orderCount: 1, quantitySum: 1, score: 0.5 },
        ];
        const repo = makeRepo(items);
        const useCase = new GetGlobalPopularProductsUseCase(repo);

        const result = await useCase.execute({ categoryIds: ['c1', 'c2'], limit: 10 });

        expect(result).toEqual(items);
        expect(repo.findTopProductsGlobal).toHaveBeenCalledWith({
            categoryIds: ['c1', 'c2'],
            limit: 10,
            statusCodes: INCLUDED_ORDER_CODES,
            withTimeDecay: true,
        });
    });

    it('returns empty array when repository has no data', async () => {
        const repo = makeRepo([]);
        const useCase = new GetGlobalPopularProductsUseCase(repo);

        const result = await useCase.execute({ limit: 5 });

        expect(result).toEqual([]);
    });
});
