/**
 * Заполняет поле stock у всех товаров случайным значением от 5 до 50.
 *
 * Запуск: npx tsx scripts/seed-stock.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not defined');

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function randomStock(): number {
    return Math.floor(Math.random() * 46) + 5; // 5..50
}

async function main() {
    const products = await prisma.product.findMany({ select: { id: true, article: true } });
    console.log(`Обновление остатков для ${products.length} товаров...`);

    for (const product of products) {
        const stock = randomStock();
        await prisma.product.update({ where: { id: product.id }, data: { stock } });
        console.log(`  ${product.article}: ${stock}`);
    }

    console.log('\nГотово.');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
