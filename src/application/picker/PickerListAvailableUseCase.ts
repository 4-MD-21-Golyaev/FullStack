import { OrderRepository } from '@/application/ports/OrderRepository';
import { Order } from '@/domain/order/Order';

export class PickerListAvailableUseCase {
    constructor(private orderRepository: OrderRepository) {}

    async execute(): Promise<Order[]> {
        return this.orderRepository.findAvailableForPicking();
    }
}
