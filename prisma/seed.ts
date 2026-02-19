import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined')
}

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({
    adapter,
})

async function main() {
    const orderStatuses = [
        { code: 'CREATED', name: 'Создан' },
        { code: 'PICKING', name: 'Сборка' },
        { code: 'PAYMENT', name: 'Ожидание оплаты' },
        { code: 'DELIVERY', name: 'Доставка' },
        { code: 'CLOSED', name: 'Закрыт' },
        { code: 'CANCELLED', name: 'Отменён' },
    ]

    for (const status of orderStatuses) {
        await prisma.orderStatus.upsert({
            where: { code: status.code },
            update: { name: status.name },
            create: status,
        })
    }

    const paymentStatuses = [
        { code: 'PENDING', name: 'Ожидает' },
        { code: 'SUCCESS', name: 'Успешно' },
        { code: 'FAILED', name: 'Ошибка' },
    ]

    for (const status of paymentStatuses) {
        await prisma.paymentStatus.upsert({
            where: { code: status.code },
            update: {},
            create: status,
        })
    }

    // Тестовая категория (нужна для тестового товара)
    await prisma.category.upsert({
        where: { id: 'CT' },
        update: {},
        create: {
            id: 'CT',
            name: 'Тестовая категория',
        },
    })

    // Тестовый пользователь
    await prisma.user.upsert({
        where: { id: 'UT' },
        update: {},
        create: {
            id: 'UT',
            phone: '+70000000000',
            email: 'test@example.com',
            address: 'Тестовый адрес',
        },
    })

    // Тестовый товар
    await prisma.product.upsert({
        where: { id: 'PT' },
        update: {},
        create: {
            id: 'PT',
            name: 'Тестовый товар',
            article: 'TEST-001',
            price: 100,
            stock: 100,
            categoryId: 'CT',
        },
    })

    // ── Категории уровень 1 ──────────────────────────────────────────────────
    await prisma.category.createMany({
        skipDuplicates: true,
        data: [
            { id: 'CAT-1', name: 'Электроника' },
            { id: 'CAT-2', name: 'Продукты питания' },
            { id: 'CAT-3', name: 'Бытовая техника' },
            { id: 'CAT-4', name: 'Одежда и обувь' },
            { id: 'CAT-5', name: 'Товары для дома' },
        ],
    })

    // ── Категории уровень 2 ──────────────────────────────────────────────────
    await prisma.category.createMany({
        skipDuplicates: true,
        data: [
            // Электроника
            { id: 'CAT-1-1', name: 'Смартфоны',             parentId: 'CAT-1' },
            { id: 'CAT-1-2', name: 'Ноутбуки',              parentId: 'CAT-1' },
            { id: 'CAT-1-3', name: 'Телевизоры',            parentId: 'CAT-1' },
            { id: 'CAT-1-4', name: 'Аксессуары для техники',parentId: 'CAT-1' },
            // Продукты питания
            { id: 'CAT-2-1', name: 'Молочные продукты',     parentId: 'CAT-2' },
            { id: 'CAT-2-2', name: 'Мясо и рыба',           parentId: 'CAT-2' },
            { id: 'CAT-2-3', name: 'Овощи и фрукты',        parentId: 'CAT-2' },
            { id: 'CAT-2-4', name: 'Напитки',               parentId: 'CAT-2' },
            // Бытовая техника
            { id: 'CAT-3-1', name: 'Кухонная техника',      parentId: 'CAT-3' },
            { id: 'CAT-3-2', name: 'Техника для уборки',    parentId: 'CAT-3' },
            { id: 'CAT-3-3', name: 'Климатическая техника', parentId: 'CAT-3' },
            // Одежда и обувь
            { id: 'CAT-4-1', name: 'Мужская одежда',        parentId: 'CAT-4' },
            { id: 'CAT-4-2', name: 'Женская одежда',        parentId: 'CAT-4' },
            { id: 'CAT-4-3', name: 'Обувь',                 parentId: 'CAT-4' },
            // Товары для дома
            { id: 'CAT-5-1', name: 'Мебель',                parentId: 'CAT-5' },
            { id: 'CAT-5-2', name: 'Текстиль',              parentId: 'CAT-5' },
            { id: 'CAT-5-3', name: 'Посуда и кухня',        parentId: 'CAT-5' },
        ],
    })

    // ── Категории уровень 3 ──────────────────────────────────────────────────
    await prisma.category.createMany({
        skipDuplicates: true,
        data: [
            // Смартфоны
            { id: 'CAT-1-1-1', name: 'Android-смартфоны',  parentId: 'CAT-1-1' },
            { id: 'CAT-1-1-2', name: 'Смартфоны Apple',    parentId: 'CAT-1-1' },
            // Ноутбуки
            { id: 'CAT-1-2-1', name: 'Игровые ноутбуки',   parentId: 'CAT-1-2' },
            { id: 'CAT-1-2-2', name: 'Ультрабуки',         parentId: 'CAT-1-2' },
            // Молочные продукты
            { id: 'CAT-2-1-1', name: 'Молоко и сливки',    parentId: 'CAT-2-1' },
            { id: 'CAT-2-1-2', name: 'Сыры и творог',      parentId: 'CAT-2-1' },
            // Мужская одежда
            { id: 'CAT-4-1-1', name: 'Верхняя одежда',     parentId: 'CAT-4-1' },
            { id: 'CAT-4-1-2', name: 'Спортивная одежда',  parentId: 'CAT-4-1' },
        ],
    })

    // ── Товары (2 на каждую листовую категорию) ──────────────────────────────
    await prisma.product.createMany({
        skipDuplicates: true,
        data: [
            // CAT-1-3 Телевизоры
            { id: 'P-TV-1',     name: 'Телевизор Samsung 55" QLED',         article: 'TV-001',    price: 89990,  stock: 15, categoryId: 'CAT-1-3' },
            { id: 'P-TV-2',     name: 'Телевизор LG 65" OLED',              article: 'TV-002',    price: 129990, stock: 8,  categoryId: 'CAT-1-3' },
            // CAT-1-4 Аксессуары для техники
            { id: 'P-ACC-1',    name: 'Чехол универсальный',                article: 'ACC-001',   price: 990,    stock: 100,categoryId: 'CAT-1-4' },
            { id: 'P-ACC-2',    name: 'Зарядное устройство USB-C 65 Вт',    article: 'ACC-002',   price: 1490,   stock: 80, categoryId: 'CAT-1-4' },
            // CAT-2-2 Мясо и рыба
            { id: 'P-MEAT-1',   name: 'Куриное филе охлаждённое 1 кг',      article: 'MEAT-001',  price: 350,    stock: 200,categoryId: 'CAT-2-2' },
            { id: 'P-MEAT-2',   name: 'Лосось охлаждённый 500 г',           article: 'MEAT-002',  price: 890,    stock: 60, categoryId: 'CAT-2-2' },
            // CAT-2-3 Овощи и фрукты
            { id: 'P-VEG-1',    name: 'Яблоки Гала 1 кг',                   article: 'VEG-001',   price: 120,    stock: 300,categoryId: 'CAT-2-3' },
            { id: 'P-VEG-2',    name: 'Помидоры черри 500 г',               article: 'VEG-002',   price: 180,    stock: 200,categoryId: 'CAT-2-3' },
            // CAT-2-4 Напитки
            { id: 'P-DRK-1',    name: 'Вода питьевая 5 л',                  article: 'DRK-001',   price: 90,     stock: 500,categoryId: 'CAT-2-4' },
            { id: 'P-DRK-2',    name: 'Апельсиновый сок 1 л',              article: 'DRK-002',   price: 130,    stock: 300,categoryId: 'CAT-2-4' },
            // CAT-3-1 Кухонная техника
            { id: 'P-KAPP-1',   name: 'Мультиварка Redmond RMC-M800S',      article: 'KAPP-001',  price: 5990,   stock: 25, categoryId: 'CAT-3-1' },
            { id: 'P-KAPP-2',   name: 'Кофемашина DeLonghi Magnifica',      article: 'KAPP-002',  price: 24990,  stock: 10, categoryId: 'CAT-3-1' },
            // CAT-3-2 Техника для уборки
            { id: 'P-CLEAN-1',  name: 'Пылесос Dyson V15 Detect',           article: 'CLEAN-001', price: 39990,  stock: 12, categoryId: 'CAT-3-2' },
            { id: 'P-CLEAN-2',  name: 'Робот-пылесос iRobot Roomba j7',     article: 'CLEAN-002', price: 29990,  stock: 18, categoryId: 'CAT-3-2' },
            // CAT-3-3 Климатическая техника
            { id: 'P-CLIM-1',   name: 'Кондиционер Daikin FTXB25C',         article: 'CLIM-001',  price: 34990,  stock: 10, categoryId: 'CAT-3-3' },
            { id: 'P-CLIM-2',   name: 'Вентилятор напольный Ballu BFF-850', article: 'CLIM-002',  price: 3990,   stock: 40, categoryId: 'CAT-3-3' },
            // CAT-4-2 Женская одежда
            { id: 'P-WCLTH-1',  name: 'Платье летнее с принтом',            article: 'WCLTH-001', price: 2990,   stock: 50, categoryId: 'CAT-4-2' },
            { id: 'P-WCLTH-2',  name: 'Блуза шёлковая',                     article: 'WCLTH-002', price: 3490,   stock: 35, categoryId: 'CAT-4-2' },
            // CAT-4-3 Обувь
            { id: 'P-SHOE-1',   name: 'Кроссовки Nike Air Max 270',         article: 'SHOE-001',  price: 8990,   stock: 40, categoryId: 'CAT-4-3' },
            { id: 'P-SHOE-2',   name: 'Ботинки кожаные осенние',            article: 'SHOE-002',  price: 6990,   stock: 30, categoryId: 'CAT-4-3' },
            // CAT-5-1 Мебель
            { id: 'P-FURN-1',   name: 'Диван угловой Comfort Plus',         article: 'FURN-001',  price: 49990,  stock: 8,  categoryId: 'CAT-5-1' },
            { id: 'P-FURN-2',   name: 'Стол обеденный раздвижной',          article: 'FURN-002',  price: 19990,  stock: 15, categoryId: 'CAT-5-1' },
            // CAT-5-2 Текстиль
            { id: 'P-TEXT-1',   name: 'Комплект постельного белья 2-сп.',    article: 'TEXT-001',  price: 2490,   stock: 60, categoryId: 'CAT-5-2' },
            { id: 'P-TEXT-2',   name: 'Полотенце банное 70×140 см, 2 шт.',  article: 'TEXT-002',  price: 890,    stock: 100,categoryId: 'CAT-5-2' },
            // CAT-5-3 Посуда и кухня
            { id: 'P-DISH-1',   name: 'Набор кастрюль Tefal 5 предметов',   article: 'DISH-001',  price: 4990,   stock: 30, categoryId: 'CAT-5-3' },
            { id: 'P-DISH-2',   name: 'Сковорода с антипригарным покрытием', article: 'DISH-002',  price: 2490,   stock: 45, categoryId: 'CAT-5-3' },
            // CAT-1-1-1 Android-смартфоны
            { id: 'P-AND-1',    name: 'Samsung Galaxy S24',                  article: 'AND-001',   price: 79990,  stock: 30, categoryId: 'CAT-1-1-1' },
            { id: 'P-AND-2',    name: 'Xiaomi 14',                           article: 'AND-002',   price: 59990,  stock: 25, categoryId: 'CAT-1-1-1' },
            // CAT-1-1-2 Смартфоны Apple
            { id: 'P-APL-1',    name: 'iPhone 15',                           article: 'APL-001',   price: 99990,  stock: 20, categoryId: 'CAT-1-1-2' },
            { id: 'P-APL-2',    name: 'iPhone 15 Pro Max',                   article: 'APL-002',   price: 139990, stock: 12, categoryId: 'CAT-1-1-2' },
            // CAT-1-2-1 Игровые ноутбуки
            { id: 'P-GLAP-1',   name: 'ASUS ROG Strix G16',                  article: 'GLAP-001',  price: 129990, stock: 10, categoryId: 'CAT-1-2-1' },
            { id: 'P-GLAP-2',   name: 'MSI Raider GE76',                     article: 'GLAP-002',  price: 149990, stock: 8,  categoryId: 'CAT-1-2-1' },
            // CAT-1-2-2 Ультрабуки
            { id: 'P-ULAP-1',   name: 'MacBook Air M3 13"',                  article: 'ULAP-001',  price: 119990, stock: 15, categoryId: 'CAT-1-2-2' },
            { id: 'P-ULAP-2',   name: 'Dell XPS 13',                         article: 'ULAP-002',  price: 89990,  stock: 12, categoryId: 'CAT-1-2-2' },
            // CAT-2-1-1 Молоко и сливки
            { id: 'P-MILK-1',   name: 'Молоко пастеризованное 3,2% 1 л',    article: 'MILK-001',  price: 89,     stock: 500,categoryId: 'CAT-2-1-1' },
            { id: 'P-MILK-2',   name: 'Сливки 20% 200 мл',                  article: 'MILK-002',  price: 79,     stock: 300,categoryId: 'CAT-2-1-1' },
            // CAT-2-1-2 Сыры и творог
            { id: 'P-DAIR-1',   name: 'Творог зернёный 5% 250 г',           article: 'DAIR-001',  price: 129,    stock: 200,categoryId: 'CAT-2-1-2' },
            { id: 'P-DAIR-2',   name: 'Сыр Гауда 45% 200 г',               article: 'DAIR-002',  price: 249,    stock: 150,categoryId: 'CAT-2-1-2' },
            // CAT-4-1-1 Верхняя одежда
            { id: 'P-MCOAT-1',  name: 'Пальто мужское осеннее',             article: 'MCOAT-001', price: 12990,  stock: 20, categoryId: 'CAT-4-1-1' },
            { id: 'P-MCOAT-2',  name: 'Куртка пуховая мужская',             article: 'MCOAT-002', price: 9990,   stock: 30, categoryId: 'CAT-4-1-1' },
            // CAT-4-1-2 Спортивная одежда
            { id: 'P-MSPT-1',   name: 'Костюм спортивный мужской',          article: 'MSPT-001',  price: 4990,   stock: 40, categoryId: 'CAT-4-1-2' },
            { id: 'P-MSPT-2',   name: 'Шорты беговые',                      article: 'MSPT-002',  price: 1990,   stock: 60, categoryId: 'CAT-4-1-2' },
        ],
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
