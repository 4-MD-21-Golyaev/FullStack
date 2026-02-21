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

        const strategy = await this.db.absenceResolutionStrategy.findUnique({
            where: { code: order.absenceResolutionStrategy },
        });

        if (!strategy) {
            throw new Error(`AbsenceResolutionStrategy not found for code ${order.absenceResolutionStrategy}`);
        }

        await this.db.order.upsert({
            where: { id: order.id },
            update: {
                userId: order.userId,
                totalAmount: order.totalAmount,
                address: order.address,
                absenceResolutionStrategyId: strategy.id,
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
                absenceResolutionStrategyId: strategy.id,
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

    async findByUserId(userId: string): Promise<Order[]> {
        const records = await this.db.order.findMany({
            where: { userId },
            include: { items: true, status: true, absenceResolutionStrategy: true },
            orderBy: { createdAt: 'desc' },
        });

        return records.map(record => ({
            id: record.id,
            userId: record.userId,
            totalAmount: record.totalAmount.toNumber(),
            address: record.address,
            state: record.status.code as OrderState,
            absenceResolutionStrategy: record.absenceResolutionStrategy.code as AbsenceResolutionStrategy,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            items: record.items.map(item => ({
                productId: item.productId,
                name: item.name,
                article: item.article,
                price: item.price.toNumber(),
                quantity: item.quantity,
            })),
        }));
    }

    async findById(id: string): Promise<Order | null> {
        const record = await this.db.order.findUnique({
            where: { id },
            include: {
                items: true,
                status: true,
                absenceResolutionStrategy: true,
            },
        });

        if (!record) return null;

        return {
            id: record.id,
            userId: record.userId,
            totalAmount: record.totalAmount.toNumber(),
            address: record.address,
            state: record.status.code as OrderState,
            absenceResolutionStrategy: record.absenceResolutionStrategy.code as AbsenceResolutionStrategy,
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
