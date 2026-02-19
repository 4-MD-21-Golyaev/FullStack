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
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
