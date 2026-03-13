import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { registerPayment } from '@/domain/order/transitions';
import { randomUUID } from 'crypto';

interface CompletePickingInput {
    orderId: string;
}

export class CompletePickingUseCase {
    constructor(private transactionRunner: TransactionRunner) {}

    async execute(input: CompletePickingInput) {
        return this.transactionRunner.run(async ({ orderRepository, outboxRepository }) => {
            const order = await orderRepository.findById(input.orderId);

            if (!order) {
                throw new Error('Order not found');
            }

            const updated = registerPayment(order);

            await orderRepository.save(updated);

            await outboxRepository.save({
                id: randomUUID(),
                eventType: 'ORDER_PICKED',
                payload: {
                    orderId: updated.id,
                    items: updated.items.map(i => ({
                        productId: i.productId,
                        article: i.article,
                        name: i.name,
                        price: i.price,
                        quantity: i.quantity,
                    })),
                    totalAmount: updated.totalAmount,
                },
            });

            return updated;
        });
    }
}
