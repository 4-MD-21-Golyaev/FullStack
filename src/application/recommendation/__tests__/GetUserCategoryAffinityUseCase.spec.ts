import { describe, it, expect, vi } from 'vitest';
import { GetUserCategoryAffinityUseCase } from '../GetUserCategoryAffinityUseCase';
import { GetTopCategoriesUseCase } from '../GetTopCategoriesUseCase';
import { type CategoryRecommendationRepository } from '@/application/ports/CategoryRecommendationRepository';
import { type PopularCategory } from '@/domain/recommendation/PopularCategory';
import { INCLUDED_ORDER_CODES } from '@/domain/recommendation/RecommendationStatusFilter';

function makeRepo(forUser: PopularCategory[]) {
    return {
        findTopCategories: vi.fn(),
        findTopCategoriesForUser: vi.fn().mockResolvedValue(forUser),
    } as unknown as CategoryRecommendationRepository & {
        findTopCategories: ReturnType<typeof vi.fn>;
        findTopCategoriesForUser: ReturnType<typeof vi.fn>;
    };
}

describe('GetUserCategoryAffinityUseCase', () => {
    it('returns personalized result when repository has data for user', async () => {
        const items: PopularCategory[] = [
            { categoryId: 'c1', orderCount: 4, score: 4 },
        ];
        const repo = makeRepo(items);
        const fallback = new GetTopCategoriesUseCase({
            findTopCategories: vi.fn(),
            findTopCategoriesForUser: vi.fn(),
        } as unknown as CategoryRecommendationRepository);
        const fallbackSpy = vi.spyOn(fallback, 'execute');

        const useCase = new GetUserCategoryAffinityUseCase(repo, fallback);
        const result = await useCase.execute('user-1', 5);

        expect(result.items).toEqual(items);
        expect(result.personalized).toBe(true);
        expect(repo.findTopCategoriesForUser).toHaveBeenCalledWith('user-1', {
            limit: 5,
            statusCodes: INCLUDED_ORDER_CODES,
            withTimeDecay: true,
        });
        expect(fallbackSpy).not.toHaveBeenCalled();
    });

    it('falls back to global top when user has no history (personalized:false)', async () => {
        const fallbackItems: PopularCategory[] = [
            { categoryId: 'g1', orderCount: 100, score: 80 },
        ];
        const repo = makeRepo([]);
        const globalRepo = {
            findTopCategories: vi.fn().mockResolvedValue(fallbackItems),
            findTopCategoriesForUser: vi.fn(),
        };
        const fallback = new GetTopCategoriesUseCase(globalRepo as unknown as CategoryRecommendationRepository);

        const useCase = new GetUserCategoryAffinityUseCase(repo, fallback);
        const result = await useCase.execute('new-user', 3);

        expect(result.items).toEqual(fallbackItems);
        expect(result.personalized).toBe(false);
        expect(globalRepo.findTopCategories).toHaveBeenCalledTimes(1);
    });
});
