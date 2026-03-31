import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'

const require = createRequire(import.meta.url)
const catalogData = require('../docs/catalog_with_products.json')

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined')
}

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({
    adapter,
})

// ── Transliteration ───────────────────────────────────────────────────────────

const TRANSLIT_MAP: Record<string, string> = {
    а: 'a',  б: 'b',  в: 'v',  г: 'g',  д: 'd',  е: 'e',  ё: 'yo',
    ж: 'zh', з: 'z',  и: 'i',  й: 'y',  к: 'k',  л: 'l',  м: 'm',
    н: 'n',  о: 'o',  п: 'p',  р: 'r',  с: 's',  т: 't',  у: 'u',
    ф: 'f',  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '',
    ы: 'y',  ь: '',   э: 'e',  ю: 'yu', я: 'ya',
}

function transliterate(text: string): string {
    return text
        .toLowerCase()
        .split('')
        .map(ch => TRANSLIT_MAP[ch] ?? ch)
        .join('')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

function makeId(name: string, usedIds: Set<string>): string {
    const base = transliterate(name)
    let id = base
    let counter = 2
    while (usedIds.has(id)) {
        id = `${base}-${counter++}`
    }
    usedIds.add(id)
    return id
}

// ── Image path normalization (products) ──────────────────────────────────────

function normalizeImagePath(raw: string | null | undefined): string | null {
    if (!raw) return null
    const filename = raw.replace(/^images[\\\/]/, '')
    if (filename === 'no_photo.png' || !filename) return null
    return `/uploads/products/${filename}`
}

// ── Category image: rename Cyrillic file → transliterated ID, return web path ─

const CATEGORIES_DIR = path.resolve(process.cwd(), 'public/uploads/categories')

function resolveCategoryImage(name: string, id: string): string | null {
    const srcPath  = path.join(CATEGORIES_DIR, `${name}.png`)
    const destPath = path.join(CATEGORIES_DIR, `${id}.png`)

    if (fs.existsSync(destPath)) {
        // Already renamed from a previous seed run
        return `/uploads/categories/${id}.png`
    }
    if (fs.existsSync(srcPath)) {
        fs.renameSync(srcPath, destPath)
        return `/uploads/categories/${id}.png`
    }
    return null
}

// ── Type helpers ──────────────────────────────────────────────────────────────

interface RawProduct {
    title: string
    price: number | null
    image: string | null
}

interface RawCategory {
    name: string
    url: string
    children: RawCategory[]
    products: RawProduct[]
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    // ── Reference data (always upsert) ────────────────────────────────────────

    const orderStatuses = [
        { code: 'CREATED',           name: 'Создан'                  },
        { code: 'PICKING',           name: 'Сборка'                  },
        { code: 'PAYMENT',           name: 'Ожидание оплаты'         },
        { code: 'DELIVERY',          name: 'Доставка (устар.)'       },
        { code: 'DELIVERY_ASSIGNED', name: 'Назначена доставка'      },
        { code: 'OUT_FOR_DELIVERY',  name: 'В пути'                  },
        { code: 'DELIVERED',         name: 'Доставлен'               },
        { code: 'CLOSED',            name: 'Закрыт'                  },
        { code: 'CANCELLED',         name: 'Отменён'                 },
    ]
    for (const status of orderStatuses) {
        await prisma.orderStatus.upsert({
            where:  { code: status.code },
            update: { name: status.name },
            create: status,
        })
    }

    const paymentStatuses = [
        { code: 'PENDING', name: 'Ожидает' },
        { code: 'SUCCESS', name: 'Успешно' },
        { code: 'FAILED',  name: 'Ошибка'  },
    ]
    for (const status of paymentStatuses) {
        await prisma.paymentStatus.upsert({
            where:  { code: status.code },
            update: {},
            create: status,
        })
    }

    const absenceStrategies = [
        { code: 'CALL_REPLACE', name: 'Позвонить и предложить замену' },
        { code: 'CALL_REMOVE',  name: 'Позвонить и убрать позицию'   },
        { code: 'AUTO_REPLACE', name: 'Автоматически заменить'        },
        { code: 'AUTO_REMOVE',  name: 'Автоматически убрать'          },
    ]
    for (const strategy of absenceStrategies) {
        await prisma.absenceResolutionStrategy.upsert({
            where:  { code: strategy.code },
            update: { name: strategy.name },
            create: { code: strategy.code, name: strategy.name },
        })
    }

    const userRoles = [
        { code: 'CUSTOMER', name: 'Покупатель'       },
        { code: 'STAFF',    name: 'Сотрудник склада' },
        { code: 'PICKER',   name: 'Сборщик'          },
        { code: 'COURIER',  name: 'Курьер'           },
        { code: 'ADMIN',    name: 'Администратор'    },
    ]
    for (const role of userRoles) {
        await prisma.userRole.upsert({
            where:  { code: role.code },
            update: { name: role.name },
            create: role,
        })
    }

    // ── Test users (preserved across re-seeds) ─────────────────────────────────

    await prisma.user.upsert({
        where:  { email: 'test@example.com' },
        update: { role: 'CUSTOMER' },
        create: {
            phone:   '+70000000000',
            email:   'test@example.com',
            address: 'Тестовый адрес',
            role:    'CUSTOMER',
        },
    })

    await prisma.user.upsert({
        where:  { email: 'staff@example.com' },
        update: { role: 'STAFF' },
        create: {
            phone: '+70000000001',
            email: 'staff@example.com',
            role:  'STAFF',
        },
    })

    await prisma.user.upsert({
        where:  { email: 'admin@example.com' },
        update: { role: 'ADMIN' },
        create: {
            phone: '+70000000002',
            email: 'admin@example.com',
            role:  'ADMIN',
        },
    })

    await prisma.user.upsert({
        where:  { email: 'picker@example.com' },
        update: { role: 'PICKER' },
        create: {
            phone: '+70000000003',
            email: 'picker@example.com',
            role:  'PICKER',
        },
    })

    await prisma.user.upsert({
        where:  { email: 'courier@example.com' },
        update: { role: 'COURIER' },
        create: {
            phone: '+70000000004',
            email: 'courier@example.com',
            role:  'COURIER',
        },
    })

    // ── Clear old catalog (cascade order) ─────────────────────────────────────
    // Must follow FK dependency order: cart/order items before orders before products before categories

    console.log('Clearing old catalog...')
    await prisma.cartItem.deleteMany()
    await prisma.payment.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.product.deleteMany()
    // Delete child categories before parents
    await prisma.category.deleteMany({ where: { parentId: { not: null } } })
    await prisma.category.deleteMany()
    console.log('Old catalog cleared.')

    // ── Build and seed new catalog ────────────────────────────────────────────

    const catalog = catalogData as RawCategory[]
    const usedCatIds = new Set<string>()
    const usedProductIds = new Set<string>()

    // Pass 1: create top-level categories
    const topCategoryRows: { id: string; name: string; imagePath: string | null }[] = []
    for (const topCat of catalog) {
        const id = makeId(topCat.name, usedCatIds)
        topCategoryRows.push({ id, name: topCat.name, imagePath: resolveCategoryImage(topCat.name, id) })
    }
    await prisma.category.createMany({ data: topCategoryRows })
    console.log(`Created ${topCategoryRows.length} top-level categories.`)

    // Pass 2: create sub-categories
    const subCategoryRows: { id: string; name: string; parentId: string; imagePath: string | null }[] = []
    const subCategoryIdByIndex: string[][] = [] // parallel to catalog[i].children[j]

    for (let i = 0; i < catalog.length; i++) {
        const topCat = catalog[i]
        const parentId = topCategoryRows[i].id
        subCategoryIdByIndex.push([])

        for (const subCat of topCat.children) {
            const id = makeId(subCat.name, usedCatIds)
            subCategoryRows.push({ id, name: subCat.name, parentId, imagePath: resolveCategoryImage(subCat.name, id) })
            subCategoryIdByIndex[i].push(id)
        }
    }
    await prisma.category.createMany({ data: subCategoryRows })
    console.log(`Created ${subCategoryRows.length} sub-categories.`)

    // Pass 3: create products in batches
    const BATCH_SIZE = 200
    let productRows: {
        id: string
        name: string
        article: string
        price: number
        stock: number
        imagePath: string | null
        categoryId: string
    }[] = []
    let totalCreated = 0
    let totalSkipped = 0

    const flush = async () => {
        if (productRows.length === 0) return
        await prisma.product.createMany({ data: productRows, skipDuplicates: true })
        totalCreated += productRows.length
        productRows = []
    }

    for (let i = 0; i < catalog.length; i++) {
        for (let j = 0; j < catalog[i].children.length; j++) {
            const subCat = catalog[i].children[j]
            const categoryId = subCategoryIdByIndex[i][j]

            for (const product of subCat.products) {
                // Skip invalid records
                if (!product.price || product.price <= 0) {
                    totalSkipped++
                    continue
                }
                if (!product.title || product.title.startsWith('301 ') || product.title.startsWith('404 ')) {
                    totalSkipped++
                    continue
                }

                const id = makeId(product.title, usedProductIds)
                const imagePath = normalizeImagePath(product.image)

                productRows.push({
                    id,
                    name:       product.title,
                    article:    id,        // slug doubles as article
                    price:      product.price,
                    stock:      10,        // default stock for seeded catalog
                    imagePath,
                    categoryId,
                })

                if (productRows.length >= BATCH_SIZE) {
                    await flush()
                }
            }
        }
    }
    await flush()

    console.log(`Created ${totalCreated} products (skipped ${totalSkipped} invalid).`)
    console.log('Seed complete.')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
