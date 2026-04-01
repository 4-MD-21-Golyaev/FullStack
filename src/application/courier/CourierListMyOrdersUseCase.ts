import { type OrderRepository } from '@/application/ports/OrderRepository';
import { type Order } from '@/domain/order/Order';

interface CourierListMyOrdersInput {
    userId: string;
}

export class CourierListMyOrdersUseCase {
    constructor(private orderRepository: OrderRepository) {}

    async execute(input: CourierListMyOrdersInput): Promise<Order[]> {
        return this.orderRepository.findByCourierClaimUserId(input.userId);
    }
}
