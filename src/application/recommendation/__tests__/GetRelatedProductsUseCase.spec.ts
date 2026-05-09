import { describe, it, expect, vi } from 'vitest';
import { GetRelatedProductsUseCase } from '../GetRelatedProductsUseCase';
import { GetGlobalPopularProductsUseCase } from '../GetGlobalPopularProductsUseCase';
import { type ProductRecommendationRepository } from '@/application/ports/ProductRecommendationRepository';
import { type ProductRepository } from '@/application/ports/ProductRepository';
import { type Product } from '@/domain/product/Product';
import { type RelatedProduct } from '@/domain/recommendation/RelatedProduct';
import { type PopularProduct } from '@/domain/recommendation/PopularProduct';
import { INCLUDED_ORDER_CODES } from '@/domain/recommendation/RecommendationStatusFilter';

function makeProductRecRepo(opts: { related?: RelatedProduct[]; global?: PopularProduct[] } = {}) {
    return {
        findTopProductsForUser: vi.fn(),
        findTopProductsGlobal: vi.fn().mockResolvedValue(opts.global ?? []),
        findRelatedProductsJaccard: vi.fn().mockResolvedValue(opts.related ?? []),
    } as unknown as ProductRecommendationRepository & {
        findRelatedProductsJaccard: ReturnType<typeof vi.fn>;
        findTopProductsGlobal: ReturnType<typeof vi.fn>;
    };
}

function makeProductRepo(seed?: Product | null) {
    return {
        findById: vi.fn().mockResolvedValue(seed ?? null),
        findByIds: vi.fn(),
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
        findByCategoryIds: vi.fn(),
        findByArticle: vi.fn(),
        findBySearch: vi.fn(),
        save: vi.fn(),
    } as unknown as ProductRepository & { findById: ReturnType<typeof vi.fn> };
}

const product = (id: string, categoryId = 'cat-x'): Product => ({
    id,
    name: id,
    article: id,
    price: 100,
    stock: 10,
    imagePath: null,
    categoryId,
});

describe('GetRelatedProductsUseCase', () => {
    it('returns personalized items when there are enough Jaccard neighbors', async () => {
        const related: RelatedProduct[] = [
            { productId: 'p1', coOccurrenceCount: 5, jaccardScore: 0.7 },
            { productId: 'p2', coOccurrenceCount: 4, jaccardScore: 0.5 },
        ];
        const recRepo = makeProductRecRepo({ related });
        const productRepo = makeProductRepo();
        const fallback = new GetGlobalPopularProductsUseCase(recRepo);
        const fallbackSpy = vi.spyOn(fallback, 'execute');

        const useCase = new GetRelatedProductsUseCase(recRepo, productRepo, fallback);
        const result = await useCase.execute('seed', 6);

        expect(result.items).toEqual([
            { productId: 'p1', coOccurrenceCount: 5, jaccardScore: 0.7 },
            { productId: 'p2', coOccurrenceCount: 4, jaccardScore: 0.5 },
        ]);
        expect(result.fallbackUsed).toBe(false);
        expect(recRepo.findRelatedProductsJaccard).toHaveBeenCalledWith('seed', {
            limit: 6,
            minCoOccurrence: 3,
            statusCodes: INCLUDED_ORDER_CODES,
        });
        expect(productRepo.findById).not.toHaveBeenCalled();
        expect(fallbackSpy).not.toHaveBeenCalled();
    });

    it('falls back to category-popular excluding seed when neighbors are below threshold', async () => {
        const seed = product('seed', 'cat-1');
        const popular: PopularProduct[] = [
            { productId: 'seed', orderCount: 9, quantitySum: 9, score: 9 }, // self — must be excluded
            { productId: 'p1', orderCount: 8, quantitySum: 8, score: 8 },
            { productId: 'p2', orderCount: 7, quantitySum: 7, score: 7 },
        ];
        const recRepo = makeProductRecRepo({ related: [], global: popular });
        const productRepo = makeProductRepo(seed);
        const fallback = new GetGlobalPopularProductsUseCase(recRepo);

        const useCase = new GetRelatedProductsUseCase(recRepo, productRepo, fallback);
        const result = await useCase.execute('seed', 2);

        expect(result.fallbackUsed).toBe(true);
        // Seed excluded; remaining sliced to limit; jaccardScore 0 marker.
        expect(result.items).toEqual([
            { productId: 'p1', coOccurrenceCount: 0, jaccardScore: 0 },
            { productId: 'p2', coOccurrenceCount: 0, jaccardScore: 0 },
        ]);
        expect(productRepo.findById).toHaveBeenCalledWith('seed');
        // fallback called with limit + 1 to leave room after self-exclusion
        expect(recRepo.findTopProductsGlobal).toHaveBeenCalledWith(
            expect.objectContaining({ categoryIds: ['cat-1'], limit: 3 }),
        );
    });

    it('returns empty items + fallbackUsed:true when seed product is not found', async () => {
        const recRepo = makeProductRecRepo({ related: [] });
        const productRepo = makeProductRepo(null);
        const fallback = new GetGlobalPopularProductsUseCase(recRepo);
        const fallbackSpy = vi.spyOn(fallback, 'execute');

        const useCase = new GetRelatedProductsUseCase(recRepo, productRepo, fallback);
        const result = await useCase.execute('missing', 6);

        expect(result.items).toEqual([]);
        expect(result.fallbackUsed).toBe(true);
        expect(fallbackSpy).not.toHaveBeenCalled();
    });
});
