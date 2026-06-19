/**
 * Generates synthetic DELIVERED/CLOSED orders for offline evaluation of the
 * recommendation system. Creates a small set of "persona" users with biased
 * category preferences so that:
 *   - global popularity, user-popularity and CF approaches produce different
 *     recommendations (you can see the effect of personalization),
 *   - orders are spread over the past 180 days so time-decay variants
 *     can be compared.
 *
 * Run: npx tsx scripts/seed-recommendation-orders.ts [orders-per-user]
 *
 * Default 12 orders per user × 12 users = 144 orders.
 *
 * Idempotency: re-running creates additional orders for the same eval users.
 * To start fresh: delete orders/users with email like 'eval-user-%@test.local'.
 *
 * Safety: refuses to run when NODE_ENV === 'production'.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (process.env.NODE_ENV === 'production') {
    throw new Error('seed-recommendation-orders.ts must not run in production');
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not defined');

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PERSONAS = 4;
const USERS_PER_PERSONA = 3;
const TOTAL_USERS = PERSONAS * USERS_PER_PERSONA;
const DEFAULT_ORDERS_PER_USER = 12;
const ITEMS_PER_ORDER_MIN = 2;
const ITEMS_PER_ORDER_MAX = 6;
const DAYS_BACK = 180;

interface Persona {
    name: string;
    rootCategoryHint: string[]; // substring match against root category names
}

// Hints are substring-matched (case-insensitive) against ROOT category names of
// the seeded grocery catalog. Every hint below resolves to at least one real
// root, so no persona falls back to a random product slice. Staple roots
// (молочка, овощи, мясо, бакалея, выпечка) intentionally overlap across several
// personas — exactly like a real grocery where everyone buys basics — so they
// rise to the top of the homepage category recommendations.
const PERSONA_DEFS: Persona[] = [
    // Family weekly shop: dairy, meat, produce, staples, kids, bakery
    { name: 'family',      rootCategoryHint: ['молоч', 'мясо', 'овощ', 'бакале', 'детск', 'выпеч'] },
    // Health-conscious: produce, fish, "твой рацион", dairy, frozen
    { name: 'healthy',     rootCategoryHint: ['овощ', 'рыба', 'рацион', 'молоч', 'заморож'] },
    // Sweet tooth / snacking: confectionery, bakery, snacks, drinks
    { name: 'sweet-tooth', rootCategoryHint: ['кондитер', 'выпеч', 'снек', 'напитк'] },
    // Pet owner + household runs: pet, home/auto/garden, staples
    { name: 'pet-home',    rootCategoryHint: ['зоо', 'дом', 'бакале'] },
];

async function main() {
    const ordersPerUserArg = parseInt(process.argv[2] ?? String(DEFAULT_ORDERS_PER_USER), 10);
    const ordersPerUser = isNaN(ordersPerUserArg) ? DEFAULT_ORDERS_PER_USER : ordersPerUserArg;

    console.log(`[seed] Generating ${ordersPerUser} orders × ${TOTAL_USERS} users = ${ordersPerUser * TOTAL_USERS} total`);

    const status = await prisma.orderStatus.findFirst({ where: { code: { in: ['DELIVERED', 'CLOSED'] } } });
    if (!status) throw new Error('No OrderStatus with code DELIVERED/CLOSED found');
    const statusClosedId = status.id;
    const statusDelivered = await prisma.orderStatus.findFirst({ where: { code: 'DELIVERED' } });
    const statusDeliveredId = statusDelivered?.id ?? statusClosedId;

    const absence = await prisma.absenceResolutionStrategy.findFirst();
    if (!absence) throw new Error('No AbsenceResolutionStrategy found');

    const allCategories = await prisma.category.findMany();
    const allProducts = await prisma.product.findMany({ select: { id: true, name: true, article: true, price: true, categoryId: true } });
    if (allProducts.length < 20) throw new Error(`Need at least 20 products in DB, have ${allProducts.length}`);

    const rootCategories = allCategories.filter(c => c.parentId === null);
    console.log(`[seed] Roots: ${rootCategories.map(r => r.name).join(', ')}`);

    const personaToProducts = mapPersonasToProducts(rootCategories, allCategories, allProducts);
    for (const persona of PERSONA_DEFS) {
        const count = personaToProducts.get(persona.name)?.length ?? 0;
        console.log(`[seed]   persona "${persona.name}" → ${count} candidate products`);
    }

    const users = await ensureEvalUsers(TOTAL_USERS);
    console.log(`[seed] Eval users ready: ${users.length}`);

    let createdOrders = 0;
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const personaIdx = i % PERSONAS;
        const persona = PERSONA_DEFS[personaIdx];
        const personaProducts = personaToProducts.get(persona.name) ?? allProducts;
        const tailProducts = allProducts;

        for (let n = 0; n < ordersPerUser; n++) {
            const itemCount = randInt(ITEMS_PER_ORDER_MIN, ITEMS_PER_ORDER_MAX);
            const items: typeof allProducts = [];
            // 70% from persona, 30% random
            for (let k = 0; k < itemCount; k++) {
                const pool = Math.random() < 0.7 ? personaProducts : tailProducts;
                if (pool.length === 0) continue;
                const pick = pool[randInt(0, pool.length - 1)];
                if (!items.find(x => x.id === pick.id)) items.push(pick);
            }
            if (items.length === 0) continue;

            const createdAt = randomDateWithin(DAYS_BACK);
            const useDelivered = Math.random() < 0.4;
            const total = items.reduce((acc, it) => acc + Number(it.price), 0);

            await prisma.order.create({
                data: {
                    userId: user.id,
                    statusId: useDelivered ? statusDeliveredId : statusClosedId,
                    totalAmount: total,
                    address: 'Test address, eval seed',
                    absenceResolutionStrategyId: absence.id,
                    createdAt,
                    updatedAt: createdAt,
                    items: {
                        create: items.map(it => ({
                            productId: it.id,
                            name: it.name,
                            article: it.article,
                            price: it.price,
                            quantity: randInt(1, 3),
                        })),
                    },
                },
            });
            createdOrders += 1;
        }
    }

    console.log(`[seed] Created ${createdOrders} orders`);
    await prisma.$disconnect();
}

async function ensureEvalUsers(count: number) {
    const existing = await prisma.user.findMany({ where: { email: { startsWith: 'eval-user-' } } });
    if (existing.length >= count) return existing.slice(0, count);

    const toCreate = count - existing.length;
    for (let i = existing.length; i < existing.length + toCreate; i++) {
        await prisma.user.create({
            data: {
                email: `eval-user-${i + 1}@test.local`,
                phone: `+7900000${String(i + 1).padStart(4, '0')}`,
                role: 'CUSTOMER',
            },
        });
    }
    return prisma.user.findMany({ where: { email: { startsWith: 'eval-user-' } } });
}

function mapPersonasToProducts(
    roots: { id: string; name: string }[],
    all: { id: string; name: string; parentId: string | null }[],
    products: { id: string; categoryId: string }[],
): Map<string, { id: string; name: string; article: string; price: unknown; categoryId: string }[]> {
    const map = new Map<string, { id: string; name: string; article: string; price: unknown; categoryId: string }[]>();
    const productsByCat = new Map<string, typeof products>();
    for (const p of products) {
        const arr = productsByCat.get(p.categoryId) ?? [];
        arr.push(p);
        productsByCat.set(p.categoryId, arr);
    }

    const descendantsCache = new Map<string, Set<string>>();
    function descendants(rootId: string): Set<string> {
        const cached = descendantsCache.get(rootId);
        if (cached) return cached;
        const set = new Set<string>([rootId]);
        const queue = [rootId];
        while (queue.length > 0) {
            const cur = queue.shift()!;
            for (const c of all) {
                if (c.parentId === cur && !set.has(c.id)) {
                    set.add(c.id);
                    queue.push(c.id);
                }
            }
        }
        descendantsCache.set(rootId, set);
        return set;
    }

    for (const persona of PERSONA_DEFS) {
        const matchedRoots = roots.filter(r =>
            persona.rootCategoryHint.some(h => r.name.toLowerCase().includes(h)),
        );
        const allowedCats = new Set<string>();
        for (const r of matchedRoots) {
            for (const id of descendants(r.id)) allowedCats.add(id);
        }
        const filtered = products.filter(p => allowedCats.has(p.categoryId));
        // Fallback to a slice of all products if persona matched nothing — keeps the run going
        map.set(
            persona.name,
            (filtered.length > 0
                ? filtered
                : products.slice(0, Math.max(50, Math.floor(products.length / PERSONAS)))
            ) as never,
        );
    }
    return map;
}

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithin(days: number): Date {
    const now = Date.now();
    const offsetMs = Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
    return new Date(now - offsetMs);
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
