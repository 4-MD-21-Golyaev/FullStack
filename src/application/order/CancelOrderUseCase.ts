import { OrderRepository } from '@/application/ports/OrderRepository';
import { cancelOrder } from '@/domain/order/transitions';

interface CancelOrderInput {
    orderId: string;
}

export class CancelOrderUseCase {
    constructor(private orderRepository: OrderRepository) {}

    async execute(input: CancelOrderInput) {
        const order = await this.orderRepository.findById(input.orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        const updated = cancelOrder(order);

        await this.orderRepository.save(updated);

        return updated;
    }
}
