import { OrderRepository } from '../ports/OrderRepository';
import { registerPaymentSuccess } from '@/domain/order/transitions';

interface RegisterPaymentInput {
    orderId: string;
}

export class RegisterPaymentResultUseCase {
    constructor(private orderRepository: OrderRepository) {}

    async execute(input: RegisterPaymentInput) {
        const order = await this.orderRepository.findById(input.orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        const updated = registerPaymentSuccess(order);

        await this.orderRepository.save(updated);

        return updated;
    }
}
