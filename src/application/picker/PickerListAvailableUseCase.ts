import { type OrderRepository } from '@/application/ports/OrderRepository';
import { type Order } from '@/domain/order/Order';

export class PickerListAvailableUseCase {
    constructor(private orderRepository: OrderRepository) {}

    async execute(): Promise<Order[]> {
        return this.orderRepository.findAvailableForPicking();
    }
}
