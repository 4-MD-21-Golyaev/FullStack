import { type OrderRepository } from './OrderRepository';
import { type PaymentRepository } from './PaymentRepository';
import { type ProductRepository } from './ProductRepository';
import { type OutboxRepository } from './OutboxRepository';
import { type AuditLogRepository } from './AuditLogRepository';

export interface TransactionContext {
    orderRepository: OrderRepository;
    paymentRepository: PaymentRepository;
    productRepository: ProductRepository;
    outboxRepository: OutboxRepository;
    auditLogRepository: AuditLogRepository;
}

export interface TransactionRunner {
    run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}
