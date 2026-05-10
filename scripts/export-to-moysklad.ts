/**
 * Экспортирует все товары и категории из локальной БД в МойСклад.
 *
 * Запуск: npx tsx scripts/export-to-moysklad.ts
 *
 * Нужны переменные окружения:
 *   DATABASE_URL
 *   MOYSKLAD_TOKEN
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// ── Config ────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not defined');

const MS_TOKEN = process.env.MOYSKLAD_TOKEN;
if (!MS_TOKEN) throw new Error('MOYSKLAD_TOKEN is not defined');

const BASE_URL = 'https://api.moysklad.ru/api/remap/1.2';
const PAGE_LIMIT = 100;

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
    return {
        'Authorization': `Bearer ${MS_TOKEN}`,
        'Content-Type': 'application/json',
    };
}

async function msGet<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}/${path}`, { headers: authHeaders() });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`МойСклад GET /${path} → ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
}

async function msPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}/${path}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`МойСклад POST /${path} → ${res.status}: ${errBody}`);
    }
    return res.json() as Promise<T>;
}

async function msPut<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}/${path}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`МойСклад PUT /${path} → ${res.status}: ${errBody}`);
    }
    return res.json() as Promise<T>;
}

/** Поиск сущности по одному полю. Возвращает первую строку или null. */
async function findByField(entityPath: string, field: string, value: string): Promise<{ id: string; meta: { href: string } } | null> {
    const url = `${entityPath}?filter=${field}%3D${encodeURIComponent(value)}&limit=1`;
    const data = await msGet<{ rows: { id: string; meta: { href: string } }[] }>(url);
    return data.rows?.length ? data.rows[0] : null;
}

/** Постраничная загрузка всех строк из списочного эндпоинта МойСклад. */
async function fetchAllPaginated<T>(path: string, mapRow: (r: any) => T): Promise<T[]> {
    const results: T[] = [];
    let offset = 0;
    while (true) {
        const separator = path.includes('?') ? '&' : '?';
        const data = await msGet<{ rows: any[]; meta: { size: number } }>(
            `${path}${separator}limit=${PAGE_LIMIT}&offset=${offset}`,
        );
        for (const row of data.rows) results.push(mapRow(row));
        offset += data.rows.length;
        if (offset >= data.meta.size || data.rows.length === 0) break;
    }
    return results;
}

function meta(href: string, type: string) {
    return { meta: { href, type, mediaType: 'application/json' } };
}

// ── Categories → productfolder ────────────────────────────────────────────────

interface DbCategory {
    id: string;
    name: string;
    parentId: string | null;
}

function topSort(categories: DbCategory[]): DbCategory[] {
    const byId = new Map(categories.map(c => [c.id, c]));
    const result: DbCategory[] = [];
    const visited = new Set<string>();

    function visit(c: DbCategory) {
        if (visited.has(c.id)) return;
        if (c.parentId && byId.has(c.parentId)) visit(byId.get(c.parentId)!);
        visited.add(c.id);
        result.push(c);
    }

    for (const c of categories) visit(c);
    return result;
}

/**
 * Загружает все папки из МойСклад одним пакетным запросом и сопоставляет их
 * с локальными категориями по имени + href родителя (in-memory, без доп. запросов).
 * Возвращает map: localCategoryId → href папки в МойСклад.
 */
async function loadFolderMapping(categories: DbCategory[]): Promise<Map<string, string>> {
    type MsFolder = { id: string; href: string; name: string; parentHref: string | null };

    const msFolders = await fetchAllPaginated<MsFolder>(
        'entity/productfolder',
        r => ({
            id:         r.id as string,
            href:       r.meta.href as string,
            name:       r.name as string,
            parentHref: (r.productFolder?.meta?.href as string) ?? null,
        }),
    );

    // key: "name|parentHref" → папка в МойСклад
    const byNameAndParent = new Map<string, MsFolder>();
    for (const f of msFolders) {
        byNameAndParent.set(`${f.name}|${f.parentHref ?? ''}`, f);
    }

    const localIdToHref = new Map<string, string>();
    const sorted = topSort(categories);

    for (const cat of sorted) {
        const parentHref = cat.parentId ? (localIdToHref.get(cat.parentId) ?? null) : null;
        const key = `${cat.name}|${parentHref ?? ''}`;
        const match = byNameAndParent.get(key);

        if (match) {
            localIdToHref.set(cat.id, match.href);
            console.log(`  [папка] "${cat.name}" — найдена`);
        } else {
            console.warn(`  [папка] "${cat.name}" — НЕ НАЙДЕНА в МойСклад, товары категории будут пропущены`);
        }
    }

    return localIdToHref;
}

// ── Products ──────────────────────────────────────────────────────────────────

interface DbProduct {
    id: string;
    name: string;
    article: string;
    price: number;
    stock: number;
    categoryId: string;
}

async function getRubCurrencyHref(): Promise<string> {
    const data = await msGet<{ rows: { meta: { href: string } }[] }>(
        'entity/currency?filter=isoCode%3DRUB&limit=1',
    );
    if (!data.rows?.length) throw new Error('Валюта RUB не найдена в МойСклад');
    return data.rows[0].meta.href;
}

async function getDefaultPriceTypeHref(): Promise<string> {
    const data = await msGet<{ priceTypes: { meta: { href: string } }[] }>('context/companysettings');
    if (!data.priceTypes?.length) throw new Error('Типы цен не найдены в настройках МойСклад');
    return data.priceTypes[0].meta.href;
}

function buildProductBody(
    product: DbProduct,
    folderHref: string | undefined,
    rubCurrencyHref: string,
    priceTypeHref: string,
): Record<string, unknown> {
    const body: Record<string, unknown> = {
        name: product.name,
        code: product.article,
        salePrices: [
            {
                value: Math.round(product.price * 100),
                currency: meta(rubCurrencyHref, 'currency'),
                priceType: meta(priceTypeHref, 'pricetype'),
            },
        ],
    };

    if (folderHref) {
        body.productFolder = meta(folderHref, 'productfolder');
    }

    return body;
}

async function syncProductsForCategory(
    categoryName: string,
    products: DbProduct[],
    folderHref: string | undefined,
    rubCurrencyHref: string,
    priceTypeHref: string,
    totals: { created: number; updated: number; errors: string[] },
): Promise<void> {
    console.log(`\n  Категория: "${categoryName}" (${products.length} товаров)`);

    for (const product of products) {
        const body = buildProductBody(product, folderHref, rubCurrencyHref, priceTypeHref);

        try {
            const existing = await findByField('entity/product', 'code', product.article);

            if (existing) {
                await msPut(`entity/product/${existing.id}`, body);
                console.log(`    [товар] "${product.name}" (${product.article}) — обновлён`);
                totals.updated++;
            } else {
                await msPost('entity/product', body);
                console.log(`    [товар] "${product.name}" (${product.article}) — создан`);
                totals.created++;
            }
        } catch (err: any) {
            const msg = `${product.article}: ${err.message ?? err}`;
            console.error(`    [ошибка] ${msg}`);
            totals.errors.push(msg);
        }
    }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
    console.log('=== Экспорт товаров в МойСклад ===\n');

    // 1. Загружаем данные из БД
    const [dbCategories, dbProducts] = await Promise.all([
        prisma.category.findMany(),
        prisma.product.findMany(),
    ]);

    console.log(`Категорий в БД: ${dbCategories.length}`);
    console.log(`Товаров в БД:   ${dbProducts.length}\n`);

    // 2. Получаем href валюты RUB и типа цены
    const [rubCurrencyHref, priceTypeHref] = await Promise.all([
        getRubCurrencyHref(),
        getDefaultPriceTypeHref(),
    ]);

    // 3. Загружаем маппинг категорий → папок МойСклад (один запрос)
    console.log('Загрузка папок из МойСклад...');
    const categoryIdToFolderHref = await loadFolderMapping(dbCategories);
    console.log();

    // 4. Группируем товары по категории, категории — по алфавиту
    const productsByCategoryId = new Map<string, DbProduct[]>();
    for (const product of dbProducts) {
        const list = productsByCategoryId.get(product.categoryId) ?? [];
        list.push(product);
        productsByCategoryId.set(product.categoryId, list);
    }

    const categoriesSorted = [...dbCategories].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    // 5. Экспорт по категориям
    console.log('Синхронизация товаров по категориям...');
    const totals = { created: 0, updated: 0, errors: [] as string[] };

    for (const category of categoriesSorted) {
        const products = productsByCategoryId.get(category.id);
        if (!products?.length) continue;

        const folderHref = categoryIdToFolderHref.get(category.id);
        await syncProductsForCategory(category.name, products, folderHref, rubCurrencyHref, priceTypeHref, totals);
    }

    // 6. Итог
    console.log('\n=== Результат ===');
    console.log(`Создано:   ${totals.created}`);
    console.log(`Обновлено: ${totals.updated}`);
    if (totals.errors.length > 0) {
        console.log(`Ошибки (${totals.errors.length}):`);
        for (const e of totals.errors) console.log(`  - ${e}`);
    } else {
        console.log('Ошибок нет.');
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
