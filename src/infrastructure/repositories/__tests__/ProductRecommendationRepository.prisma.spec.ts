import { describe, it, expect, vi } from 'vitest';
import { PrismaProductRecommendationRepository } from '../ProductRecommendationRepository.prisma';
import { INCLUDED_ORDER_CODES } from '@/domain/recommendation/RecommendationStatusFilter';

function makeDb(rows: any[]) {
    return {
        $queryRaw: vi.fn().mockResolvedValue(rows),
    };
}

describe('PrismaProductRecommendationRepository.findTopProductsGlobal', () => {
    it('maps bigint order_count and quantity_sum to numbers', async () => {
        const rows = [
            { product_id: 'p1', order_count: BigInt(10), quantity_sum: BigInt(25), score: '5.5' },
        ];
        const db = makeDb(rows);
        const repo = new PrismaProductRecommendationRepository(db as any);

        const result = await repo.findTopProductsGlobal({
            limit: 5,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
        expect(result).toEqual([
            { productId: 'p1', orderCount: 10, quantitySum: 25, score: 5.5 },
        ]);
    });

    it('returns empty array when no products match', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRecommendationRepository(db as any);

        const result = await repo.findTopProductsGlobal({
            limit: 5,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(result).toEqual([]);
    });

    it('issues one $queryRaw call for plain count branch', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRecommendationRepository(db as any);

        await repo.findTopProductsGlobal({
            limit: 3,
            statusCodes: INCLUDED_ORDER_CODES,
            withTimeDecay: false,
        });

        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('issues one $queryRaw call for time-decay branch', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRecommendationRepository(db as any);

        await repo.findTopProductsGlobal({
            limit: 3,
            statusCodes: INCLUDED_ORDER_CODES,
            withTimeDecay: true,
        });

        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('runs without crashing when categoryIds is provided (non-empty)', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRecommendationRepository(db as any);

        await repo.findTopProductsGlobal({
            categoryIds: ['c1', 'c2'],
            limit: 3,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('runs without crashing when categoryIds is undefined (skipped via Prisma.empty)', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRecommendationRepository(db as any);

        await repo.findTopProductsGlobal({
            categoryIds: undefined,
            limit: 3,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('runs without crashing when categoryIds is an empty array (skipped via Prisma.empty)', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRecommendationRepository(db as any);

        await repo.findTopProductsGlobal({
            categoryIds: [],
            limit: 3,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    });
});

describe('PrismaProductRecommendationRepository.findTopProductsForUser', () => {
    it('maps row fields and runs one query for user-scoped popular products', async () => {
        const rows = [
            { product_id: 'p1', order_count: BigInt(2), quantity_sum: BigInt(3), score: 2 },
        ];
        const db = makeDb(rows);
        const repo = new PrismaProductRecommendationRepository(db as any);

        const result = await repo.findTopProductsForUser('user-1', {
            limit: 5,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
        expect(result).toEqual([
            { productId: 'p1', orderCount: 2, quantitySum: 3, score: 2 },
        ]);
    });

    it('returns empty array when no rows', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRecommendationRepository(db as any);

        const result = await repo.findTopProductsForUser('user-1', {
            limit: 5,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(result).toEqual([]);
    });
});

describe('PrismaProductRecommendationRepository.findRelatedProductsJaccard', () => {
    it('maps rows correctly and converts numeric jaccard score', async () => {
        const rows = [
            { product_id: 'p1', co_occurrence_count: 5, jaccard_score: '0.42' },
            { product_id: 'p2', co_occurrence_count: 4, jaccard_score: 0.21 },
        ];
        const db = makeDb(rows);
        const repo = new PrismaProductRecommendationRepository(db as any);

        const result = await repo.findRelatedProductsJaccard('seed', {
            limit: 6,
            minCoOccurrence: 3,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
        expect(result).toEqual([
            { productId: 'p1', coOccurrenceCount: 5, jaccardScore: 0.42 },
            { productId: 'p2', coOccurrenceCount: 4, jaccardScore: 0.21 },
        ]);
    });

    it('maps null jaccard_score to 0', async () => {
        const rows = [
            { product_id: 'p1', co_occurrence_count: 3, jaccard_score: null },
        ];
        const db = makeDb(rows);
        const repo = new PrismaProductRecommendationRepository(db as any);

        const result = await repo.findRelatedProductsJaccard('seed', {
            limit: 6,
            minCoOccurrence: 3,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(result).toEqual([
            { productId: 'p1', coOccurrenceCount: 3, jaccardScore: 0 },
        ]);
    });

    it('returns empty array when no co-occurrences are found', async () => {
        const db = makeDb([]);
        const repo = new PrismaProductRecommendationRepository(db as any);

        const result = await repo.findRelatedProductsJaccard('seed', {
            limit: 6,
            minCoOccurrence: 3,
            statusCodes: INCLUDED_ORDER_CODES,
        });

        expect(result).toEqual([]);
    });
});
