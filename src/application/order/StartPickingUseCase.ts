import { OrderRepository } from '@/application/ports/OrderRepository';
import { startPicking } from '@/domain/order/transitions';

interface StartPickingInput {
    orderId: string;
}

export class StartPickingUseCase {
    constructor(private orderRepository: OrderRepository) {}

    async execute(input: StartPickingInput) {
        const order = await this.orderRepository.findById(input.orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        const updated = startPicking(order);

        await this.orderRepository.save(updated);

        return updated;
    }
}
