import { Order } from '@/domain/order/Order';
import { Payment } from '@/domain/payment/Payment';
import { Product } from '@/domain/product/Product';
import { OrderRepository } from './OrderRepository';
import { PaymentRepository } from './PaymentRepository';
import { ProductRepository } from './ProductRepository';

export interface LockableOrderRepository extends OrderRepository {
    findByIdWithLock(id: string): Promise<Order | null>;
}

export interface LockablePaymentRepository extends PaymentRepository {
    findByExternalIdWithLock(externalId: string): Promise<Payment | null>;
}

export interface LockableProductRepository extends ProductRepository {
    findByIdWithLock(id: string): Promise<Product | null>;
}

export interface TransactionContext {
    orderRepository: LockableOrderRepository;
    paymentRepository: LockablePaymentRepository;
    productRepository: LockableProductRepository;
}

export interface TransactionRunner {
    run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}
