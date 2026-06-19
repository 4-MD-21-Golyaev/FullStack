import type { PrismaClient, Prisma } from '@prisma/client';
import { Prisma as PrismaNS } from '@prisma/client';
import {
    type CategoryRecommendationRepository,
    type FindTopCategoriesOptions,
    type FindTopCategoriesForUserOptions,
} from '@/application/ports/CategoryRecommendationRepository';
import { type CategoryRepository } from '@/application/ports/CategoryRepository';
import { type PopularCategory } from '@/domain/recommendation/PopularCategory';
import { findRootCategoryId } from '@/domain/category/utils';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

interface RawRow {
    category_id: string;
    order_count: bigint;
    score: number | string;
}

export class PrismaCategoryRecommendationRepository implements CategoryRecommendationRepository {
    private db: DbClient;

    constructor(
        private readonly categoryRepo: CategoryRepository,
        db?: DbClient,
    ) {
        this.db = db ?? prisma;
    }

    async findTopCategories(opts: FindTopCategoriesOptions): Promise<PopularCategory[]> {
        const scoreExpr = this.scoreExpr(opts.withTimeDecay ?? false);
        const statuses = [...opts.statusCodes];

        // When rolling up to roots, aggregate ALL leaf categories before limiting.
        // Capping leaves first would drop a root whose orders are spread across
        // many subcategories (each individual leaf scoring below the cap) — e.g.
        // a confectionery root with 15 children loses to a 3-child root despite
        // far more total orders. The rollup, not the leaf count, decides the top.
        const limitClause = opts.rootOnly ? PrismaNS.empty : PrismaNS.sql`LIMIT ${opts.limit}`;

        const rows = await this.db.$queryRaw<RawRow[]>(PrismaNS.sql`
            SELECT p."categoryId" AS category_id,
                   COUNT(DISTINCT o.id) AS order_count,
                   ${scoreExpr} AS score
            FROM "OrderItem" oi
            JOIN "Order" o ON o.id = oi."orderId"
            JOIN "OrderStatus" s ON s.id = o."statusId"
            JOIN "Product" p ON p.id = oi."productId"
            WHERE s.code = ANY(${statuses}::text[])
            GROUP BY p."categoryId"
            ORDER BY score DESC, order_count DESC
            ${limitClause}
        `);

        const mapped = rows.map(this.toPopularCategory);

        if (!opts.rootOnly) return mapped.slice(0, opts.limit);

        return await this.collapseToRoots(mapped, opts.limit);
    }

    async findTopCategoriesForUser(userId: string, opts: FindTopCategoriesForUserOptions): Promise<PopularCategory[]> {
        const scoreExpr = this.scoreExpr(opts.withTimeDecay ?? false);
        const statuses = [...opts.statusCodes];

        const rows = await this.db.$queryRaw<RawRow[]>(PrismaNS.sql`
            SELECT p."categoryId" AS category_id,
                   COUNT(DISTINCT o.id) AS order_count,
                   ${scoreExpr} AS score
            FROM "OrderItem" oi
            JOIN "Order" o ON o.id = oi."orderId"
            JOIN "OrderStatus" s ON s.id = o."statusId"
            JOIN "Product" p ON p.id = oi."productId"
            WHERE s.code = ANY(${statuses}::text[])
              AND o."userId" = ${userId}
            GROUP BY p."categoryId"
            ORDER BY score DESC, order_count DESC
            LIMIT ${opts.limit}
        `);

        return rows.map(this.toPopularCategory);
    }

    private scoreExpr(withTimeDecay: boolean): Prisma.Sql {
        if (!withTimeDecay) {
            return PrismaNS.sql`COUNT(DISTINCT o.id)::float`;
        }
        return PrismaNS.sql`SUM(CASE
            WHEN o."createdAt" > NOW() - INTERVAL '30 days' THEN 1.0
            WHEN o."createdAt" > NOW() - INTERVAL '90 days' THEN 0.5
            ELSE 0.25
        END)::float`;
    }

    private toPopularCategory(row: RawRow): PopularCategory {
        return {
            categoryId: row.category_id,
            orderCount: Number(row.order_count),
            score: Number(row.score),
        };
    }

    private async collapseToRoots(items: PopularCategory[], limit: number): Promise<PopularCategory[]> {
        if (items.length === 0) return [];
        const allCategories = await this.categoryRepo.findAll();
        const rootScore = new Map<string, PopularCategory>();
        for (const item of items) {
            const rootId = findRootCategoryId(item.categoryId, allCategories);
            const existing = rootScore.get(rootId);
            if (!existing) {
                rootScore.set(rootId, { ...item, categoryId: rootId });
            } else {
                existing.orderCount += item.orderCount;
                existing.score += item.score;
            }
        }
        return Array.from(rootScore.values())
            .sort((a, b) => b.score - a.score || b.orderCount - a.orderCount)
            .slice(0, limit);
    }
}
