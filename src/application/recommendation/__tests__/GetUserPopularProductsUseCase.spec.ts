import { describe, it, expect, vi } from 'vitest';
import { GetUserPopularProductsUseCase } from '../GetUserPopularProductsUseCase';
import { GetGlobalPopularProductsUseCase } from '../GetGlobalPopularProductsUseCase';
import { type ProductRecommendationRepository } from '@/application/ports/ProductRecommendationRepository';
import { type CategoryRepository } from '@/application/ports/CategoryRepository';
import { type Category } from '@/domain/category/Category';
import { type PopularProduct } from '@/domain/recommendation/PopularProduct';
import { INCLUDED_ORDER_CODES } from '@/domain/recommendation/RecommendationStatusFilter';

function makeProductRecRepo(opts: { user?: PopularProduct[]; global?: PopularProduct[] } = {}) {
    return {
        findTopProductsForUser: vi.fn().mockResolvedValue(opts.user ?? []),
        findTopProductsGlobal: vi.fn().mockResolvedValue(opts.global ?? []),
        findRelatedProductsJaccard: vi.fn(),
    } as unknown as ProductRecommendationRepository & {
        findTopProductsForUser: ReturnType<typeof vi.fn>;
        findTopProductsGlobal: ReturnType<typeof vi.fn>;
    };
}

function makeCategoryRepo(all: Category[]) {
    return {
        findAll: vi.fn().mockResolvedValue(all),
        findByParentId: vi.fn(),
        findById: vi.fn(),
        findByNameAndParent: vi.fn(),
        save: vi.fn(),
    } as unknown as CategoryRepository & { findAll: ReturnType<typeof vi.fn> };
}

const cat = (id: string, parentId: string | null = null): Category => ({
    id,
    name: id,
    imagePath: null,
    parentId,
});

describe('GetUserPopularProductsUseCase', () => {
    it('returns personalized hit when user has matching purchases', async () => {
        const personal: PopularProduct[] = [
            { productId: 'p1', orderCount: 3, quantitySum: 5, score: 3 },
        ];
        const productRepo = makeProductRecRepo({ user: personal });
        const categoryRepo = makeCategoryRepo([]);
        const fallback = new GetGlobalPopularProductsUseCase(productRepo);
        const fallbackSpy = vi.spyOn(fallback, 'execute');

        const useCase = new GetUserPopularProductsUseCase(productRepo, categoryRepo, fallback);
        const result = await useCase.execute('user-1', null, 10);

        expect(result.items).toEqual(personal);
        expect(result.personalized).toBe(true);
        expect(result.fallbackUsed).toBe(false);
        expect(productRepo.findTopProductsForUser).toHaveBeenCalledWith('user-1', {
            categoryIds: undefined,
            limit: 10,
            statusCodes: INCLUDED_ORDER_CODES,
            withTimeDecay: true,
        });
        expect(fallbackSpy).not.toHaveBeenCalled();
        expect(categoryRepo.findAll).not.toHaveBeenCalled();
    });

    it('falls back to global with fallbackUsed:true when user has no purchases', async () => {
        const globalItems: PopularProduct[] = [
            { productId: 'g1', orderCount: 100, quantitySum: 200, score: 80 },
        ];
        const productRepo = makeProductRecRepo({ user: [], global: globalItems });
        const categoryRepo = makeCategoryRepo([]);
        const fallback = new GetGlobalPopularProductsUseCase(productRepo);

        const useCase = new GetUserPopularProductsUseCase(productRepo, categoryRepo, fallback);
        const result = await useCase.execute('new-user', null, 5);

        expect(result.items).toEqual(globalItems);
        expect(result.personalized).toBe(false);
        expect(result.fallbackUsed).toBe(true);
        expect(productRepo.findTopProductsGlobal).toHaveBeenCalledTimes(1);
    });

    it('expands category tree via CategoryRepository.findAll + collectDescendantIds when categoryId is provided', async () => {
        const personal: PopularProduct[] = [
            { productId: 'p1', orderCount: 2, quantitySum: 4, score: 2 },
        ];
        const productRepo = makeProductRecRepo({ user: personal });
        const categories = [
            cat('root'),
            cat('a', 'root'),
            cat('a1', 'a'),
            cat('b', 'root'),
        ];
        const categoryRepo = makeCategoryRepo(categories);
        const fallback = new GetGlobalPopularProductsUseCase(productRepo);

        const useCase = new GetUserPopularProductsUseCase(productRepo, categoryRepo, fallback);
        await useCase.execute('user-1', 'root', 10);

        expect(categoryRepo.findAll).toHaveBeenCalledTimes(1);
        const call = vi.mocked(productRepo.findTopProductsForUser).mock.calls[0];
        expect(call[0]).toBe('user-1');
        expect(call[1].categoryIds.sort()).toEqual(['a', 'a1', 'b', 'root']);
    });

    it('does not expand tree and passes undefined categoryIds when categoryId is null', async () => {
        const productRepo = makeProductRecRepo({ user: [] , global: [] });
        const categoryRepo = makeCategoryRepo([]);
        const fallback = new GetGlobalPopularProductsUseCase(productRepo);

        const useCase = new GetUserPopularProductsUseCase(productRepo, categoryRepo, fallback);
        await useCase.execute('user-1', null, 5);

        expect(categoryRepo.findAll).not.toHaveBeenCalled();
        const call = vi.mocked(productRepo.findTopProductsForUser).mock.calls[0];
        expect(call[1].categoryIds).toBeUndefined();
    });

    it('passes expanded categoryIds to fallback when user has no history', async () => {
        const productRepo = makeProductRecRepo({ user: [], global: [] });
        const categories = [cat('root'), cat('a', 'root')];
        const categoryRepo = makeCategoryRepo(categories);
        const fallback = new GetGlobalPopularProductsUseCase(productRepo);

        const useCase = new GetUserPopularProductsUseCase(productRepo, categoryRepo, fallback);
        await useCase.execute('new-user', 'root', 5);

        const globalCall = vi.mocked(productRepo.findTopProductsGlobal).mock.calls[0][0];
        expect(globalCall.categoryIds.sort()).toEqual(['a', 'root']);
    });
});
