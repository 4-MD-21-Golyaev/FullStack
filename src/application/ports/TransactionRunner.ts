import { OrderRepository } from './OrderRepository';
import { PaymentRepository } from './PaymentRepository';
import { ProductRepository } from './ProductRepository';
import { OutboxRepository } from './OutboxRepository';
import { AuditLogRepository } from './AuditLogRepository';

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
