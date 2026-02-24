import { Order } from '@/domain/order/Order';

export interface OrderRepository {
    save(order: Order): Promise<void>;
    findById(id: string): Promise<Order | null>;
    findByUserId(userId: string): Promise<Order[]>;
    findStaleInPayment(olderThan: Date): Promise<Order[]>;
}
