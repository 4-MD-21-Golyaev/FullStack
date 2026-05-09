/**
 * Offline evaluation of recommendation approaches for the e-commerce thesis.
 *
 * Reads orders from the local DB, splits them into train / test by time,
 * runs five approaches against the train set, and reports
 * Precision@K, Recall@K, Hit Rate@K, Coverage and Diversity for each.
 *
 * Output: console table + CSV at docs/eval-results.csv.
 *
 * Run: npx tsx scripts/recommendations-eval.ts
 */

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not defined');

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const K = 10;
const INCLUDED_CODES = ['DELIVERED', 'CLOSED'] as const;
const TRAIN_RATIO = 0.8;
const MIN_CO_OCCURRENCE = 2; // relax for small seeds
const OUTPUT_CSV = resolve(__dirname, '..', 'docs', 'eval-results.csv');

type ApproachId = 'random' | 'global-popular' | 'user-popular' | 'cf-jaccard' | 'global-popular-decay';

interface OrderRow {
    id: string;
    userId: string;
    createdAt: Date;
    productIds: string[];
    categoryIds: string[];
}

interface Metrics {
    approach: ApproachId;
    precision: number;
    recall: number;
    hitRate: number;
    coverage: number;
    diversity: number;
    usersEvaluated: number;
}

async function main() {
    console.log('[eval] Loading orders from DB...');
    const orders = await loadOrders();
    if (orders.length === 0) {
        console.error('[eval] No orders with included status. Aborting.');
        return;
    }
    console.log(`[eval] Loaded ${orders.length} orders.`);

    const sorted = [...orders].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const splitIdx = Math.floor(sorted.length * TRAIN_RATIO);
    const train = sorted.slice(0, splitIdx);
    const test = sorted.slice(splitIdx);
    console.log(`[eval] Split: train=${train.length}, test=${test.length}`);

    const totalCatalog = await catalogSize();
    const productCategory = await productCategoryMap();

    const testByUser = groupByUser(test);
    const usersInTest = Array.from(testByUser.keys());
    console.log(`[eval] Users in test set: ${usersInTest.length}`);

    const approaches: ApproachId[] = [
        'random',
        'global-popular',
        'user-popular',
        'cf-jaccard',
        'global-popular-decay',
    ];

    const results: Metrics[] = [];
    for (const approach of approaches) {
        console.log(`[eval] Running approach: ${approach}`);
        const metrics = await evaluateApproach({
            approach,
            train,
            testByUser,
            usersInTest,
            totalCatalog,
            productCategory,
        });
        results.push(metrics);
    }

    printTable(results);
    writeCsv(results);

    await prisma.$disconnect();
}

async function loadOrders(): Promise<OrderRow[]> {
    type Row = {
        id: string;
        userId: string;
        createdAt: Date;
        productId: string;
        categoryId: string;
    };
    const rows = await prisma.$queryRawUnsafe<Row[]>(`
        SELECT o.id, o."userId", o."createdAt", oi."productId", p."categoryId"
        FROM "Order" o
        JOIN "OrderStatus" s ON s.id = o."statusId"
        JOIN "OrderItem" oi ON oi."orderId" = o.id
        JOIN "Product" p ON p.id = oi."productId"
        WHERE s.code IN ('${INCLUDED_CODES.join("','")}')
    `);

    const byOrder = new Map<string, OrderRow>();
    for (const r of rows) {
        let order = byOrder.get(r.id);
        if (!order) {
            order = { id: r.id, userId: r.userId, createdAt: r.createdAt, productIds: [], categoryIds: [] };
            byOrder.set(r.id, order);
        }
        order.productIds.push(r.productId);
        order.categoryIds.push(r.categoryId);
    }
    return Array.from(byOrder.values());
}

async function catalogSize(): Promise<number> {
    const count = await prisma.product.count();
    return count;
}

async function productCategoryMap(): Promise<Map<string, string>> {
    const products = await prisma.product.findMany({ select: { id: true, categoryId: true } });
    const map = new Map<string, string>();
    for (const p of products) map.set(p.id, p.categoryId);
    return map;
}

function groupByUser(orders: OrderRow[]): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    for (const o of orders) {
        let set = map.get(o.userId);
        if (!set) {
            set = new Set();
            map.set(o.userId, set);
        }
        for (const pid of o.productIds) set.add(pid);
    }
    return map;
}

interface EvalParams {
    approach: ApproachId;
    train: OrderRow[];
    testByUser: Map<string, Set<string>>;
    usersInTest: string[];
    totalCatalog: number;
    productCategory: Map<string, string>;
}

async function evaluateApproach(params: EvalParams): Promise<Metrics> {
    const { approach, train, testByUser, usersInTest, totalCatalog, productCategory } = params;

    let precisionSum = 0;
    let recallSum = 0;
    let hits = 0;
    let evaluated = 0;
    const recommendedAll = new Set<string>();
    const diversitySum: number[] = [];

    // Pre-compute reusable structures
    const allTrainItems = train.flatMap(o => o.productIds);
    const productPopularity = popularityCounts(allTrainItems);
    const productPopularityDecay = popularityCountsWithDecay(train);
    const userTrainItems = userItemsMap(train);
    const itemCoOccurrence = coOccurrenceMap(train);

    for (const user of usersInTest) {
        const testSet = testByUser.get(user);
        if (!testSet || testSet.size === 0) continue;

        const userSeen = userTrainItems.get(user) ?? new Set<string>();
        const recs = pickTopK(approach, user, K, {
            productPopularity,
            productPopularityDecay,
            userSeen,
            itemCoOccurrence,
            allProducts: Array.from(productPopularity.keys()),
        });

        for (const r of recs) recommendedAll.add(r);

        const intersection = recs.filter(r => testSet.has(r));
        precisionSum += intersection.length / K;
        recallSum += intersection.length / testSet.size;
        if (intersection.length > 0) hits += 1;
        evaluated += 1;

        const categories = new Set<string>();
        for (const r of recs) {
            const cat = productCategory.get(r);
            if (cat) categories.add(cat);
        }
        diversitySum.push(categories.size / Math.max(recs.length, 1));
    }

    const usersEvaluated = Math.max(evaluated, 1);
    return {
        approach,
        precision: precisionSum / usersEvaluated,
        recall: recallSum / usersEvaluated,
        hitRate: hits / usersEvaluated,
        coverage: recommendedAll.size / Math.max(totalCatalog, 1),
        diversity: diversitySum.length === 0
            ? 0
            : diversitySum.reduce((a, b) => a + b, 0) / diversitySum.length,
        usersEvaluated: evaluated,
    };
}

interface PickContext {
    productPopularity: Map<string, number>;
    productPopularityDecay: Map<string, number>;
    userSeen: Set<string>;
    itemCoOccurrence: Map<string, Map<string, number>>;
    allProducts: string[];
}

function pickTopK(approach: ApproachId, user: string, k: number, ctx: PickContext): string[] {
    switch (approach) {
        case 'random':
            return shuffle([...ctx.allProducts]).slice(0, k);
        case 'global-popular':
            return topByMap(ctx.productPopularity, k);
        case 'global-popular-decay':
            return topByMap(ctx.productPopularityDecay, k);
        case 'user-popular': {
            if (ctx.userSeen.size === 0) return topByMap(ctx.productPopularity, k);
            const counts = new Map<string, number>();
            for (const item of ctx.userSeen) {
                counts.set(item, (counts.get(item) ?? 0) + 1);
            }
            const userTop = topByMap(counts, k);
            if (userTop.length >= k) return userTop;
            const rest = topByMap(ctx.productPopularity, k * 2).filter(p => !ctx.userSeen.has(p));
            return userTop.concat(rest).slice(0, k);
        }
        case 'cf-jaccard': {
            const seedItems = Array.from(ctx.userSeen);
            if (seedItems.length === 0) return topByMap(ctx.productPopularity, k);
            const scores = new Map<string, number>();
            for (const seed of seedItems) {
                const neighbors = ctx.itemCoOccurrence.get(seed);
                if (!neighbors) continue;
                for (const [other, count] of neighbors) {
                    if (ctx.userSeen.has(other)) continue;
                    if (count < MIN_CO_OCCURRENCE) continue;
                    scores.set(other, (scores.get(other) ?? 0) + count);
                }
            }
            const cfTop = topByMap(scores, k);
            if (cfTop.length >= k) return cfTop;
            const fill = topByMap(ctx.productPopularity, k * 2).filter(p => !ctx.userSeen.has(p) && !cfTop.includes(p));
            return cfTop.concat(fill).slice(0, k);
        }
    }
}

function popularityCounts(productIds: string[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const id of productIds) map.set(id, (map.get(id) ?? 0) + 1);
    return map;
}

function popularityCountsWithDecay(orders: OrderRow[]): Map<string, number> {
    const now = Date.now();
    const day = 1000 * 60 * 60 * 24;
    const map = new Map<string, number>();
    for (const order of orders) {
        const ageDays = (now - order.createdAt.getTime()) / day;
        const weight = ageDays < 30 ? 1.0 : ageDays < 90 ? 0.5 : 0.25;
        for (const pid of order.productIds) {
            map.set(pid, (map.get(pid) ?? 0) + weight);
        }
    }
    return map;
}

function userItemsMap(orders: OrderRow[]): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    for (const order of orders) {
        let set = map.get(order.userId);
        if (!set) {
            set = new Set();
            map.set(order.userId, set);
        }
        for (const pid of order.productIds) set.add(pid);
    }
    return map;
}

function coOccurrenceMap(orders: OrderRow[]): Map<string, Map<string, number>> {
    const map = new Map<string, Map<string, number>>();
    for (const order of orders) {
        const items = Array.from(new Set(order.productIds));
        for (let i = 0; i < items.length; i++) {
            for (let j = 0; j < items.length; j++) {
                if (i === j) continue;
                let inner = map.get(items[i]);
                if (!inner) {
                    inner = new Map();
                    map.set(items[i], inner);
                }
                inner.set(items[j], (inner.get(items[j]) ?? 0) + 1);
            }
        }
    }
    return map;
}

function topByMap(map: Map<string, number>, k: number): string[] {
    return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, k)
        .map(([id]) => id);
}

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function printTable(rows: Metrics[]) {
    const formatted = rows.map(r => ({
        approach: r.approach,
        [`Precision@${K}`]: r.precision.toFixed(4),
        [`Recall@${K}`]: r.recall.toFixed(4),
        [`HitRate@${K}`]: r.hitRate.toFixed(4),
        Coverage: r.coverage.toFixed(4),
        Diversity: r.diversity.toFixed(4),
        Users: r.usersEvaluated,
    }));
    console.table(formatted);
}

function writeCsv(rows: Metrics[]) {
    const header = `approach,precision@${K},recall@${K},hitRate@${K},coverage,diversity,usersEvaluated`;
    const body = rows.map(r =>
        [r.approach, r.precision, r.recall, r.hitRate, r.coverage, r.diversity, r.usersEvaluated].join(','),
    ).join('\n');
    mkdirSync(dirname(OUTPUT_CSV), { recursive: true });
    writeFileSync(OUTPUT_CSV, header + '\n' + body + '\n', 'utf8');
    console.log(`[eval] CSV written to ${OUTPUT_CSV}`);
}

main().catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
});
