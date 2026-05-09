import type { PrismaClient, Prisma } from '@prisma/client';
import { Prisma as PrismaNS } from '@prisma/client';
import {
    type ProductRecommendationRepository,
    type FindTopProductsOptions,
    type FindRelatedProductsOptions,
} from '@/application/ports/ProductRecommendationRepository';
import { type PopularProduct } from '@/domain/recommendation/PopularProduct';
import { type RelatedProduct } from '@/domain/recommendation/RelatedProduct';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

interface RawPopularRow {
    product_id: string;
    order_count: bigint;
    quantity_sum: bigint;
    score: number | string;
}

interface RawRelatedRow {
    product_id: string;
    co_occurrence_count: number;
    jaccard_score: number | string | null;
}

export class PrismaProductRecommendationRepository implements ProductRecommendationRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async findTopProductsForUser(userId: string, opts: FindTopProductsOptions): Promise<PopularProduct[]> {
        return this.findTopProducts({ ...opts, userId });
    }

    async findTopProductsGlobal(opts: FindTopProductsOptions): Promise<PopularProduct[]> {
        return this.findTopProducts({ ...opts, userId: null });
    }

    async findRelatedProductsJaccard(productId: string, opts: FindRelatedProductsOptions): Promise<RelatedProduct[]> {
        const statuses = [...opts.statusCodes];
        const rows = await this.db.$queryRaw<RawRelatedRow[]>(PrismaNS.sql`
            WITH target_orders AS (
                SELECT DISTINCT o.id
                FROM "OrderItem" oi
                JOIN "Order" o ON o.id = oi."orderId"
                JOIN "OrderStatus" s ON s.id = o."statusId"
                WHERE oi."productId" = ${productId}
                  AND s.code = ANY(${statuses}::text[])
            ),
            target_count AS (SELECT COUNT(*)::float AS c FROM target_orders),
            co AS (
                SELECT oi."productId" AS pid,
                       COUNT(DISTINCT oi."orderId")::float AS inter
                FROM "OrderItem" oi
                WHERE oi."orderId" IN (SELECT id FROM target_orders)
                  AND oi."productId" <> ${productId}
                GROUP BY oi."productId"
            ),
            candidate_orders AS (
                SELECT oi."productId" AS pid,
                       COUNT(DISTINCT o.id)::float AS total
                FROM "OrderItem" oi
                JOIN "Order" o ON o.id = oi."orderId"
                JOIN "OrderStatus" s ON s.id = o."statusId"
                WHERE s.code = ANY(${statuses}::text[])
                  AND oi."productId" IN (SELECT pid FROM co)
                GROUP BY oi."productId"
            )
            SELECT co.pid AS product_id,
                   co.inter::int AS co_occurrence_count,
                   (co.inter / NULLIF((SELECT c FROM target_count) + ca.total - co.inter, 0)) AS jaccard_score
            FROM co
            JOIN candidate_orders ca ON ca.pid = co.pid
            WHERE co.inter >= ${opts.minCoOccurrence}
            ORDER BY jaccard_score DESC NULLS LAST, co.inter DESC
            LIMIT ${opts.limit}
        `);

        return rows.map(row => ({
            productId: row.product_id,
            coOccurrenceCount: Number(row.co_occurrence_count),
            jaccardScore: row.jaccard_score === null ? 0 : Number(row.jaccard_score),
        }));
    }

    private async findTopProducts(opts: FindTopProductsOptions & { userId: string | null }): Promise<PopularProduct[]> {
        const statuses = [...opts.statusCodes];
        const scoreExpr = this.scoreExpr(opts.withTimeDecay ?? false);
        const userFilter = opts.userId
            ? PrismaNS.sql`AND o."userId" = ${opts.userId}`
            : PrismaNS.empty;
        const categoryFilter = opts.categoryIds && opts.categoryIds.length > 0
            ? PrismaNS.sql`AND p."categoryId" = ANY(${opts.categoryIds}::text[])`
            : PrismaNS.empty;

        const rows = await this.db.$queryRaw<RawPopularRow[]>(PrismaNS.sql`
            SELECT oi."productId" AS product_id,
                   COUNT(DISTINCT o.id) AS order_count,
                   SUM(oi.quantity) AS quantity_sum,
                   ${scoreExpr} AS score
            FROM "OrderItem" oi
            JOIN "Order" o ON o.id = oi."orderId"
            JOIN "OrderStatus" s ON s.id = o."statusId"
            JOIN "Product" p ON p.id = oi."productId"
            WHERE s.code = ANY(${statuses}::text[])
            ${categoryFilter}
            ${userFilter}
            GROUP BY oi."productId"
            ORDER BY score DESC, order_count DESC, quantity_sum DESC
            LIMIT ${opts.limit}
        `);

        return rows.map(row => ({
            productId: row.product_id,
            orderCount: Number(row.order_count),
            quantitySum: Number(row.quantity_sum),
            score: Number(row.score),
        }));
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
}
