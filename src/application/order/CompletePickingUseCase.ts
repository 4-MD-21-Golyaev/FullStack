import { OrderRepository } from '@/application/ports/OrderRepository';
import { registerPayment } from '@/domain/order/transitions';

interface CompletePickingInput {
    orderId: string;
}

export class CompletePickingUseCase {
    constructor(private orderRepository: OrderRepository) {}

    async execute(input: CompletePickingInput) {
        const order = await this.orderRepository.findById(input.orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        const updated = registerPayment(order);

        await this.orderRepository.save(updated);

        return updated;
    }
}
