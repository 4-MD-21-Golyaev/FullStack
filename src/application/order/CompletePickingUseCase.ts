import { type TransactionRunner } from '@/application/ports/TransactionRunner';
import { registerPayment } from '@/domain/order/transitions';
import { randomUUID } from 'crypto';

interface CompletePickingInput {
    orderId: string;
    unprocessedProductIds: string[];
}

export class CompletePickingUseCase {
    constructor(private transactionRunner: TransactionRunner) {}

    async execute(input: CompletePickingInput) {
        return this.transactionRunner.run(async ({ orderRepository, outboxRepository }) => {
            const order = await orderRepository.findById(input.orderId);

            if (!order) {
                throw new Error('Order not found');
            }

            if (input.unprocessedProductIds.length > 0) {
                throw new Error('Cannot complete picking: there are unprocessed items');
            }

            if (order.items.length === 0) {
                throw new Error('Cannot complete picking: no items were collected');
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
