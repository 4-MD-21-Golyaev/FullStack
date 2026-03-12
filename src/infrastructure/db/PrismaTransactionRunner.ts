import { Prisma } from '@prisma/client';
import { TransactionRunner, TransactionContext } from '@/application/ports/TransactionRunner';
import { prisma } from './prismaClient';
import { PrismaOrderRepository } from '../repositories/OrderRepository.prisma';
import { PrismaPaymentRepository } from '../repositories/PaymentRepository.prisma';
import { PrismaProductRepository } from '../repositories/ProductRepository.prisma';
import { PrismaOutboxRepository } from '../repositories/OutboxRepository.prisma';
import { PrismaAuditLogRepository } from '../repositories/AuditLogRepository.prisma';

export class PrismaTransactionRunner implements TransactionRunner {
    async run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T> {
        return prisma.$transaction(
            async (tx) => {
                return work({
                    orderRepository: new PrismaOrderRepository(tx),
                    paymentRepository: new PrismaPaymentRepository(tx),
                    productRepository: new PrismaProductRepository(tx),
                    outboxRepository: new PrismaOutboxRepository(tx),
                    auditLogRepository: new PrismaAuditLogRepository(tx),
                });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
    }
}
