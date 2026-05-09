import { describe, it, expect, vi } from 'vitest';
import { GetTopCategoriesUseCase } from '../GetTopCategoriesUseCase';
import { type CategoryRecommendationRepository } from '@/application/ports/CategoryRecommendationRepository';
import { type PopularCategory } from '@/domain/recommendation/PopularCategory';
import { INCLUDED_ORDER_CODES } from '@/domain/recommendation/RecommendationStatusFilter';

function makeRepo(returns: PopularCategory[]) {
    return {
        findTopCategories: vi.fn().mockResolvedValue(returns),
        findTopCategoriesForUser: vi.fn(),
    } as CategoryRecommendationRepository & {
        findTopCategories: ReturnType<typeof vi.fn>;
        findTopCategoriesForUser: ReturnType<typeof vi.fn>;
    };
}

describe('GetTopCategoriesUseCase', () => {
    it('returns popular categories with rootOnly + time decay options', async () => {
        const items: PopularCategory[] = [
            { categoryId: 'c1', orderCount: 10, score: 8 },
            { categoryId: 'c2', orderCount: 5, score: 3 },
        ];
        const repo = makeRepo(items);
        const useCase = new GetTopCategoriesUseCase(repo);

        const result = await useCase.execute(3);

        expect(result).toEqual(items);
        expect(repo.findTopCategories).toHaveBeenCalledWith({
            limit: 3,
            statusCodes: INCLUDED_ORDER_CODES,
            rootOnly: true,
            withTimeDecay: true,
        });
    });

    it('returns empty array when repository returns no rows', async () => {
        const repo = makeRepo([]);
        const useCase = new GetTopCategoriesUseCase(repo);

        const result = await useCase.execute(5);

        expect(result).toEqual([]);
        expect(repo.findTopCategories).toHaveBeenCalledTimes(1);
    });
});
