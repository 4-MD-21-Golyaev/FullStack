import type { PrismaClient, Prisma } from '@prisma/client';
import { OrderRepository } from '@/application/ports/OrderRepository';
import { Order } from '@/domain/order/Order';
import { OrderState } from '@/domain/order/OrderState';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaOrderRepository implements OrderRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async save(order: Order): Promise<void> {
        const status = await this.db.orderStatus.findUnique({
            where: { code: order.state },
        });

        if (!status) {
            throw new Error(`OrderStatus not found for code ${order.state}`);
        }

        await this.db.order.upsert({
            where: { id: order.id },
            update: {
                userId: order.userId,
                totalAmount: order.totalAmount,
                address: order.address,
                absenceResolutionStrategy: order.absenceResolutionStrategy,
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
                absenceResolutionStrategy: order.absenceResolutionStrategy,
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
        const record = await this.db.order.findUnique({
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
            totalAmount: record.totalAmount.toNumber(),
            address: record.address,
            state: record.status.code as OrderState,
            absenceResolutionStrategy: record.absenceResolutionStrategy as AbsenceResolutionStrategy,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            items: record.items.map(item => ({
                productId: item.productId,
                name: item.name,
                article: item.article,
                price: item.price.toNumber(),
                quantity: item.quantity,
            })),
        };
    }
}
