import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { cancelOrder } from '@/domain/order/transitions';

interface CancelOrderInput {
    orderId: string;
}

export class CancelOrderUseCase {
    constructor(private transactionRunner: TransactionRunner) {}

    async execute(input: CancelOrderInput) {
        return this.transactionRunner.run(async ({ orderRepository }) => {
            const order = await orderRepository.findById(input.orderId);

            if (!order) {
                throw new Error('Order not found');
            }

            const updated = cancelOrder(order);

            await orderRepository.save(updated);

            return updated;
        });
    }
}
