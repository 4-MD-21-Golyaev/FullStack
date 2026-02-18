import { OrderRepository } from '@/application/ports/OrderRepository';
import { Order } from '@/domain/order/Order';
import { OrderState } from '@/domain/order/OrderState';
import { prisma } from '../db/prismaClient';

export class PrismaOrderRepository implements OrderRepository {

    async save(order: Order): Promise<void> {

        const status = await prisma.orderStatus.findUnique({
            where: { code: order.state }
        });

        if (!status) {
            throw new Error(`OrderStatus not found for code ${order.state}`);
        }

        await prisma.order.upsert({
            where: { id: order.id },
            update: {
                userId: order.userId,
                totalAmount: order.totalAmount,
                address: order.address,
                statusId: status.id,
                updatedAt: order.updatedAt,
                items: {
                    deleteMany: {},
                    create: order.items.map(item => ({
                        productId: item.productId,
                        name: item.name,
                        article: item.article,
                        price: item.price,
                        quantity: item.quantity,
                    })),
                },
            },
            create: {
                id: order.id,
                userId: order.userId,
                totalAmount: order.totalAmount,
                address: order.address,
                statusId: status.id,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                items: {
                    create: order.items.map(item => ({
                        productId: item.productId,
                        name: item.name,
                        article: item.article,
                        price: item.price,
                        quantity: item.quantity,
                    })),
                },
            },
        });
    }

    async findById(id: string): Promise<Order | null> {

        const record = await prisma.order.findUnique({
            where: { id },
            include: {
                items: true,
                status: true,
            },
        });

        if (!record) return null;

        return {
            id: record.id,
            userId: record.userId,
            totalAmount: record.totalAmount,
            address: record.address,
            state: record.status.code as OrderState,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            items: record.items.map(item => ({
                productId: item.productId,
                name: item.name,
                article: item.article,
                price: item.price,
                quantity: item.quantity,
            })),
        };
    }
}
