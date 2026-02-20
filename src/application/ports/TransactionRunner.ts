import { OrderRepository } from './OrderRepository';
import { PaymentRepository } from './PaymentRepository';
import { ProductRepository } from './ProductRepository';

export interface TransactionContext {
    orderRepository: OrderRepository;
    paymentRepository: PaymentRepository;
    productRepository: ProductRepository;
}

export interface TransactionRunner {
    run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}
