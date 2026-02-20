import { Payment } from '@/domain/payment/Payment';

export interface PaymentRepository {
    save(payment: Payment): Promise<void>;
    findById(id: string): Promise<Payment | null>;
    findByOrderId(orderId: string): Promise<Payment | null>;
    findPendingByOrderId(orderId: string): Promise<Payment | null>;
    findByExternalId(externalId: string): Promise<Payment | null>;
    /** Returns all PENDING payments created before the given cutoff date. */
    findStalePending(olderThan: Date): Promise<Payment[]>;
}
