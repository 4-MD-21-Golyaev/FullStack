import type { PrismaClient, Prisma } from '@prisma/client';
import { PaymentRepository } from '@/application/ports/PaymentRepository';
import { Payment } from '@/domain/payment/Payment';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { prisma } from '../db/prismaClient';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaPaymentRepository implements PaymentRepository {
    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db ?? prisma;
    }

    async save(payment: Payment): Promise<void> {
        const status = await this.db.paymentStatus.findUnique({
            where: { code: payment.status },
        });

        if (!status) {
            throw new Error(`PaymentStatus not found for code ${payment.status}`);
        }

        await this.db.payment.upsert({
            where: { id: payment.id },
            update: {
                statusId: status.id,
                externalId: payment.externalId ?? null,
            },
            create: {
                id: payment.id,
                orderId: payment.orderId,
                statusId: status.id,
                amount: payment.amount,
                externalId: payment.externalId ?? null,
                createdAt: payment.createdAt,
            },
        });
    }

    async findById(id: string): Promise<Payment | null> {
        const record = await this.db.payment.findUnique({
            where: { id },
            include: { status: true },
        });

        if (!record) return null;

        return this.toPayment(record);
    }

    async findByOrderId(orderId: string): Promise<Payment | null> {
        const record = await this.db.payment.findFirst({
            where: { orderId },
            orderBy: { createdAt: 'desc' },
            include: { status: true },
        });

        if (!record) return null;

        return this.toPayment(record);
    }

    async findByExternalId(externalId: string): Promise<Payment | null> {
        const record = await this.db.payment.findFirst({
            where: { externalId },
            include: { status: true },
        });

        if (!record) return null;

        return this.toPayment(record);
    }

    private toPayment(record: any): Payment {
        return {
            id: record.id,
            orderId: record.orderId,
            amount: record.amount.toNumber(),
            status: record.status.code as PaymentStatus,
            externalId: record.externalId ?? undefined,
            createdAt: record.createdAt,
        };
    }
}
