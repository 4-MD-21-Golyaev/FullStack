import type { PrismaClient, Prisma } from '@prisma/client';
import { OrderRepository, AdminOrderFilters, AdminOrderRow } from '@/application/ports/OrderRepository';
import { Order } from '@/domain/order/Order';
import { OrderState } from '@/domain/order/OrderState';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

const ORDER_INCLUDE = {
    items: true,
    status: true,
    absenceResolutionStrategy: true,
};

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
                pickerClaimUserId: order.pickerClaimUserId ?? null,
                pickerClaimedAt: order.pickerClaimedAt ?? null,
                deliveryClaimUserId: order.deliveryClaimUserId ?? null,
                deliveryClaimedAt: order.deliveryClaimedAt ?? null,
                outForDeliveryAt: order.outForDeliveryAt ?? null,
                deliveredAt: order.deliveredAt ?? null,
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
                pickerClaimUserId: order.pickerClaimUserId ?? null,
                pickerClaimedAt: order.pickerClaimedAt ?? null,
                deliveryClaimUserId: order.deliveryClaimUserId ?? null,
                deliveryClaimedAt: order.deliveryClaimedAt ?? null,
                outForDeliveryAt: order.outForDeliveryAt ?? null,
                deliveredAt: order.deliveredAt ?? null,
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

    private toOrder(record: any): Order {
        return {
            id: record.id,
            userId: record.userId,
            totalAmount: record.totalAmount.toNumber(),
            address: record.address,
            state: record.status.code as OrderState,
            absenceResolutionStrategy: record.absenceResolutionStrategy.code as AbsenceResolutionStrategy,
            pickerClaimUserId: record.pickerClaimUserId ?? null,
            pickerClaimedAt: record.pickerClaimedAt ?? null,
            deliveryClaimUserId: record.deliveryClaimUserId ?? null,
            deliveryClaimedAt: record.deliveryClaimedAt ?? null,
            outForDeliveryAt: record.outForDeliveryAt ?? null,
            deliveredAt: record.deliveredAt ?? null,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            items: record.items.map((item: any) => ({
                productId: item.productId,
                name: item.name,
                article: item.article,
                price: item.price.toNumber(),
                quantity: item.quantity,
            })),
        };
    }

    async findByUserId(userId: string): Promise<Order[]> {
        const records = await this.db.order.findMany({
            where: { userId },
            include: ORDER_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
        return records.map(r => this.toOrder(r));
    }

    async findById(id: string): Promise<Order | null> {
        const record = await this.db.order.findUnique({
            where: { id },
            include: ORDER_INCLUDE,
        });
        if (!record) return null;
        return this.toOrder(record);
    }

    async findStaleInPayment(olderThan: Date): Promise<Order[]> {
        const records = await this.db.order.findMany({
            where: {
                status: { code: OrderState.PAYMENT },
                updatedAt: { lt: olderThan },
            },
            include: ORDER_INCLUDE,
        });
        return records.map(r => this.toOrder(r));
    }

    // ── Admin registry ───────────────────────────────────────────────────────

    async findAllWithFilters(filters: AdminOrderFilters): Promise<AdminOrderRow[]> {
        const where = this.buildAdminWhere(filters);
        const records = await this.db.order.findMany({
            where,
            include: {
                ...ORDER_INCLUDE,
                user: { select: { email: true, phone: true } },
                payments: { include: { status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
            take: filters.limit ?? 50,
            skip: filters.offset ?? 0,
        });

        const now = new Date();
        return records.map(r => {
            const order = this.toOrder(r);
            const latestPayment = (r as any).payments?.[0];
            const hasPendingPayment = latestPayment?.status?.code === 'PENDING';
            const timeInState = Math.floor((now.getTime() - r.updatedAt.getTime()) / 1000);
            const isPaymentOverdue = r.status.code === 'PAYMENT' && timeInState > 600;

            return {
                ...order,
                userEmail: (r as any).user?.email,
                userPhone: (r as any).user?.phone,
                timeInState,
                isPaymentOverdue,
                hasPendingPayment,
            };
        });
    }

    async countWithFilters(filters: Omit<AdminOrderFilters, 'limit' | 'offset'>): Promise<number> {
        return this.db.order.count({ where: this.buildAdminWhere(filters) });
    }

    private buildAdminWhere(filters: Omit<AdminOrderFilters, 'limit' | 'offset'>): Prisma.OrderWhereInput {
        const where: Prisma.OrderWhereInput = {};

        if (filters.status) {
            where.status = { code: filters.status };
        }
        if (filters.dateFrom || filters.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) (where.createdAt as any).gte = filters.dateFrom;
            if (filters.dateTo) (where.createdAt as any).lte = filters.dateTo;
        }
        if (filters.search) {
            const s = filters.search;
            where.OR = [
                { id: { contains: s, mode: 'insensitive' } },
                { user: { email: { contains: s, mode: 'insensitive' } } },
                { user: { phone: { contains: s } } },
            ];
        }

        return where;
    }

    // ── Picker queue ─────────────────────────────────────────────────────────

    async findAvailableForPicking(): Promise<Order[]> {
        const records = await this.db.order.findMany({
            where: {
                status: { code: { in: [OrderState.CREATED, OrderState.PICKING] } },
                pickerClaimUserId: null,
            },
            include: ORDER_INCLUDE,
            orderBy: { createdAt: 'asc' },
        });
        return records.map(r => this.toOrder(r));
    }

    async findByPickerClaimUserId(userId: string): Promise<Order[]> {
        const records = await this.db.order.findMany({
            where: {
                pickerClaimUserId: userId,
                status: { code: { in: [OrderState.CREATED, OrderState.PICKING] } },
            },
            include: ORDER_INCLUDE,
            orderBy: { pickerClaimedAt: 'asc' },
        });
        return records.map(r => this.toOrder(r));
    }

    async claimForPicker(orderId: string, userId: string): Promise<boolean> {
        const result = await (this.db as PrismaClient).$executeRaw`
            UPDATE "Order"
            SET "pickerClaimUserId" = ${userId}, "pickerClaimedAt" = NOW()
            WHERE id = ${orderId}
              AND "pickerClaimUserId" IS NULL
              AND "statusId" IN (
                  SELECT id FROM "OrderStatus" WHERE code IN ('CREATED', 'PICKING')
              )
        `;
        return result > 0;
    }

    async releasePickerClaim(orderId: string, requireUserId?: string): Promise<boolean> {
        let result: number;
        if (requireUserId) {
            result = await (this.db as PrismaClient).$executeRaw`
                UPDATE "Order"
                SET "pickerClaimUserId" = NULL, "pickerClaimedAt" = NULL
                WHERE id = ${orderId}
                  AND "pickerClaimUserId" = ${requireUserId}
            `;
        } else {
            result = await (this.db as PrismaClient).$executeRaw`
                UPDATE "Order"
                SET "pickerClaimUserId" = NULL, "pickerClaimedAt" = NULL
                WHERE id = ${orderId}
            `;
        }
        return result > 0;
    }

    // ── Courier queue ────────────────────────────────────────────────────────

    async findAvailableForDelivery(): Promise<Order[]> {
        const records = await this.db.order.findMany({
            where: {
                // DELIVERY_ASSIGNED = new; DELIVERY = legacy backward compat
                status: { code: { in: [OrderState.DELIVERY_ASSIGNED, OrderState.DELIVERY] } },
                deliveryClaimUserId: null,
            },
            include: ORDER_INCLUDE,
            orderBy: { createdAt: 'asc' },
        });
        return records.map(r => this.toOrder(r));
    }

    async findByCourierClaimUserId(userId: string): Promise<Order[]> {
        const records = await this.db.order.findMany({
            where: {
                deliveryClaimUserId: userId,
                status: { code: { in: [OrderState.DELIVERY_ASSIGNED, OrderState.OUT_FOR_DELIVERY, OrderState.DELIVERY] } },
            },
            include: ORDER_INCLUDE,
            orderBy: { deliveryClaimedAt: 'asc' },
        });
        return records.map(r => this.toOrder(r));
    }

    async claimForCourier(orderId: string, userId: string): Promise<boolean> {
        const result = await (this.db as PrismaClient).$executeRaw`
            UPDATE "Order"
            SET "deliveryClaimUserId" = ${userId}, "deliveryClaimedAt" = NOW()
            WHERE id = ${orderId}
              AND "deliveryClaimUserId" IS NULL
              AND "statusId" IN (
                  SELECT id FROM "OrderStatus" WHERE code IN ('DELIVERY_ASSIGNED', 'DELIVERY')
              )
        `;
        return result > 0;
    }

    async releaseCourierClaim(orderId: string, requireUserId?: string): Promise<boolean> {
        let result: number;
        if (requireUserId) {
            result = await (this.db as PrismaClient).$executeRaw`
                UPDATE "Order"
                SET "deliveryClaimUserId" = NULL, "deliveryClaimedAt" = NULL
                WHERE id = ${orderId}
                  AND "deliveryClaimUserId" = ${requireUserId}
            `;
        } else {
            result = await (this.db as PrismaClient).$executeRaw`
                UPDATE "Order"
                SET "deliveryClaimUserId" = NULL, "deliveryClaimedAt" = NULL
                WHERE id = ${orderId}
            `;
        }
        return result > 0;
    }
}
