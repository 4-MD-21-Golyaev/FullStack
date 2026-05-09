import { describe, it, expect, vi } from 'vitest';
import { PrismaCategoryRecommendationRepository } from '../CategoryRecommendationRepository.prisma';
import { type CategoryRepository } from '@/application/ports/CategoryRepository';
import { type Category } from '@/domain/category/Category';
import { INCLUDED_ORDER_CODES } from '@/domain/recommendation/RecommendationStatusFilter';

const cat = (id: string, parentId: string | null = null): Category => ({
    id,
    name: id,
    imagePath: null,
    parentId,
});

function makeCategoryRepo(all: Category[] = []) {
    return {
        findAll: vi.fn().mockResolvedValue(all),
        findByParentId: vi.fn(),
        findById: vi.fn(),
        findByNameAndParent: vi.fn(),
        save: vi.fn(),
    } as unknown as CategoryRepository & { findAll: ReturnType<typeof vi.fn> };
}

function makeDb(rows: any[]) {
    return {
        $queryRaw: vi.fn().mockResolvedValue(rows),
    };
}

describe('PrismaCategoryRecommendationRepository.findTopCategories', () => {
    it('maps bigint order_count and string score to numbers', async () => {
        const rows = [
            { category_id: 'c1', order_count: BigInt(7), score: '4.5' },
            { category_id: 'c2', order_count: BigInt(3), score: 1 },
        ];
        const db = makeDb(rows);
        const repo = new PrismaCategoryRecommendationRepository(makeCategoryRepo(), db as any);

        const result = await repo.findTopCategories({
            limit: 5,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
        expect(result).toEqual([
            { categoryId: 'c1', orderCount: 7, score: 4.5 },
            { categoryId: 'c2', orderCount: 3, score: 1 },
        ]);
    });

    it('returns empty array when query yields no rows', async () => {
        const db = makeDb([]);
        const repo = new PrismaCategoryRecommendationRepository(makeCategoryRepo(), db as any);

        const result = await repo.findTopCategories({ limit: 3, statusCodes: INCLUDED_ORDER_CODES });

        expect(result).toEqual([]);
    });

    it('rootOnly collapses children to roots and dedupes (uses CategoryRepository.findAll)', async () => {
        // Two leaf categories, both descend from "root" via "a"
        const rows = [
            { category_id: 'a1', order_count: BigInt(5), score: 5 },
            { category_id: 'a2', order_count: BigInt(3), score: 3 },
            { category_id: 'b',  order_count: BigInt(2), score: 2 },
        ];
        const db = makeDb(rows);
        const categories = [
            cat('root'),
            cat('a', 'root'),
            cat('a1', 'a'),
            cat('a2', 'a'),
            cat('b', 'root'),
        ];
        const categoryRepo = makeCategoryRepo(categories);
        const repo = new PrismaCategoryRecommendationRepository(categoryRepo, db as any);

        const result = await repo.findTopCategories({
            limit: 5,
            statusCodes: INCLUDED_ORDER_CODES,
            rootOnly: true,
        });

        expect(categoryRepo.findAll).toHaveBeenCalledTimes(1);
        // All three rows roll up into a single root "root" — deduped + score summed
        expect(result).toEqual([
            { categoryId: 'root', orderCount: 10, score: 10 },
        ]);
    });

    it('rootOnly with no rows returns []', async () => {
        const db = makeDb([]);
        const repo = new PrismaCategoryRecommendationRepository(makeCategoryRepo(), db as any);

        const result = await repo.findTopCategories({
            limit: 5,
            statusCodes: INCLUDED_ORDER_CODES,
            rootOnly: true,
        });

        expect(result).toEqual([]);
    });

    it('issues exactly one $queryRaw call for plain count branch (withTimeDecay:false)', async () => {
        const db = makeDb([]);
        const repo = new PrismaCategoryRecommendationRepository(makeCategoryRepo(), db as any);

        await repo.findTopCategories({
            limit: 3,
            statusCodes: INCLUDED_ORDER_CODES,
            withTimeDecay: false,
        });

        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('issues exactly one $queryRaw call for time-decay branch (withTimeDecay:true)', async () => {
        const db = makeDb([]);
        const repo = new PrismaCategoryRecommendationRepository(makeCategoryRepo(), db as any);

        await repo.findTopCategories({
            limit: 3,
            statusCodes: INCLUDED_ORDER_CODES,
            withTimeDecay: true,
        });

        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    });
});

describe('PrismaCategoryRecommendationRepository.findTopCategoriesForUser', () => {
    it('maps bigint order_count → number for user-scoped query', async () => {
        const rows = [
            { category_id: 'c1', order_count: BigInt(2), score: 2 },
        ];
        const db = makeDb(rows);
        const repo = new PrismaCategoryRecommendationRepository(makeCategoryRepo(), db as any);

        const result = await repo.findTopCategoriesForUser('user-1', {
            limit: 3,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
        expect(result).toEqual([
            { categoryId: 'c1', orderCount: 2, score: 2 },
        ]);
    });

    it('returns empty array when user has no purchases', async () => {
        const db = makeDb([]);
        const repo = new PrismaCategoryRecommendationRepository(makeCategoryRepo(), db as any);

        const result = await repo.findTopCategoriesForUser('new-user', {
            limit: 3,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(result).toEqual([]);
    });
});
