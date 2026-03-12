import { OrderRepository } from '@/application/ports/OrderRepository';
import { Order } from '@/domain/order/Order';

interface PickerListMyOrdersInput {
    userId: string;
}

export class PickerListMyOrdersUseCase {
    constructor(private orderRepository: OrderRepository) {}

    async execute(input: PickerListMyOrdersInput): Promise<Order[]> {
        return this.orderRepository.findByPickerClaimUserId(input.userId);
    }
}
