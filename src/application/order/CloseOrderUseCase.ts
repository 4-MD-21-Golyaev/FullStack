import { OrderRepository } from '@/application/ports/OrderRepository';
import { closeOrder } from '@/domain/order/transitions';

interface CloseOrderInput {
    orderId: string;
}

export class CloseOrderUseCase {
    constructor(private orderRepository: OrderRepository) {}

    async execute(input: CloseOrderInput) {
        const order = await this.orderRepository.findById(input.orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        const updated = closeOrder(order);

        await this.orderRepository.save(updated);

        return updated;
    }
}
