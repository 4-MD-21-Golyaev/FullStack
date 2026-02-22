import { OrderRepository } from './OrderRepository';
import { PaymentRepository } from './PaymentRepository';
import { ProductRepository } from './ProductRepository';
import { OutboxRepository } from './OutboxRepository';

export interface TransactionContext {
    orderRepository: OrderRepository;
    paymentRepository: PaymentRepository;
    productRepository: ProductRepository;
    outboxRepository: OutboxRepository;
}

export interface TransactionRunner {
    run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}
