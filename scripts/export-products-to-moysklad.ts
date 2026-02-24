/**
 * Экспорт всех товаров из БД в МойСклад.
 *
 * Запуск:  npx tsx scripts/export-products-to-moysklad.ts
 *
 * Для каждого товара скрипт:
 *  1. Проверяет, существует ли товар с таким артикулом (code) в МойСклад.
 *  2. Если нет — создаёт.
 *  3. Если да — пропускает (или обновляет, если передать флаг --update).
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = 'https://api.moysklad.ru/api/remap/1.2';

const MOYSKLAD_TOKEN = process.env.MOYSKLAD_TOKEN;
if (!MOYSKLAD_TOKEN) throw new Error('MOYSKLAD_TOKEN is not defined');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not defined');

const UPDATE_EXISTING = process.argv.includes('--update');

// ── Prisma ──────────────────────────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── Helpers ─────────────────────────────────────────────────────────────────

function headers(): Record<string, string> {
    return {
        Authorization: `Bearer ${MOYSKLAD_TOKEN}`,
        'Content-Type': 'application/json',
    };
}

interface MoySkladMeta {
    href: string;
    type: string;
    mediaType: string;
}

interface MoySkladProduct {
    meta: MoySkladMeta;
    id: string;
    name: string;
    code: string;
}

interface PriceTypeMeta {
    meta: MoySkladMeta;
}

async function fetchDefaultPriceType(): Promise<PriceTypeMeta> {
    const res = await fetch(`${BASE_URL}/context/companysettings/pricetype`, {
        headers: headers(),
    });

    if (!res.ok) {
        throw new Error(`МойСклад: получение типов цен вернуло ${res.status}`);
    }

    const data = (await res.json()) as { meta: MoySkladMeta }[];

    if (!data || data.length === 0) {
        throw new Error('МойСклад: не найден ни один тип цены');
    }

    // Первый тип цены — «Цена продажи» (по умолчанию)
    return { meta: data[0].meta };
}

async function findByArticle(article: string): Promise<MoySkladProduct | null> {
    const url = `${BASE_URL}/entity/product?filter=code%3D${encodeURIComponent(article)}&limit=1`;
    const res = await fetch(url, { headers: headers() });

    if (!res.ok) {
        throw new Error(`МойСклад: поиск товара по артикулу «${article}» вернул ${res.status}`);
    }

    const data = (await res.json()) as { rows: MoySkladProduct[] };
    return data.rows.length > 0 ? data.rows[0] : null;
}

async function createProduct(name: string, article: string, priceRubles: number, priceType: PriceTypeMeta): Promise<string> {
    const body = {
        name,
        code: article,
        article,
        salePrices: [
            {
                value: priceRubles * 100, // рубли → копейки
                priceType,
            },
        ],
    };

    const res = await fetch(`${BASE_URL}/entity/product`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`МойСклад: создание товара «${article}» вернуло ${res.status}: ${text}`);
    }

    const created = (await res.json()) as { id: string };
    return created.id;
}

async function updateProduct(href: string, name: string, article: string, priceRubles: number, priceType: PriceTypeMeta): Promise<void> {
    const body = {
        name,
        code: article,
        article,
        salePrices: [
            {
                value: priceRubles * 100,
                priceType,
            },
        ],
    };

    const res = await fetch(href, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`МойСклад: обновление товара «${article}» вернуло ${res.status}: ${text}`);
    }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('Получение типа цены из МойСклад...');
    const priceType = await fetchDefaultPriceType();
    console.log(`Тип цены: ${priceType.meta.href}`);

    const products = await prisma.product.findMany({
        orderBy: { article: 'asc' },
    });

    console.log(`Найдено ${products.length} товаров в БД.`);
    if (UPDATE_EXISTING) {
        console.log('Режим: создание + обновление существующих (--update)');
    } else {
        console.log('Режим: только создание новых (пропуск существующих)');
    }
    console.log('');

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const product of products) {
        const article = product.article;
        const name = product.name;
        const price = Number(product.price);

        try {
            const existing = await findByArticle(article);

            if (existing) {
                if (UPDATE_EXISTING) {
                    await updateProduct(existing.meta.href, name, article, price, priceType);
                    console.log(`  ✔ Обновлён: ${article} — ${name}`);
                    updated++;
                } else {
                    console.log(`  ⏭ Пропущен (уже есть): ${article} — ${name}`);
                    skipped++;
                }
            } else {
                const id = await createProduct(name, article, price, priceType);
                console.log(`  ✔ Создан: ${article} — ${name} (id: ${id})`);
                created++;
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`  ✘ Ошибка [${article}]: ${msg}`);
            failed++;
        }
    }

    console.log('');
    console.log('── Итого ──────────────────────────');
    console.log(`  Создано:    ${created}`);
    console.log(`  Обновлено:  ${updated}`);
    console.log(`  Пропущено:  ${skipped}`);
    console.log(`  Ошибок:     ${failed}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
