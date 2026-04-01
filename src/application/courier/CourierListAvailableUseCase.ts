import { type OrderRepository } from '@/application/ports/OrderRepository';
import { type Order } from '@/domain/order/Order';

export class CourierListAvailableUseCase {
    constructor(private orderRepository: OrderRepository) {}

    async execute(): Promise<Order[]> {
        return this.orderRepository.findAvailableForDelivery();
    }
}
