import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { confirmDelivered } from '@/domain/order/transitions';
import { randomUUID } from 'crypto';

interface CourierConfirmDeliveredInput {
    orderId: string;
    userId: string;
    userRole: string;
    correlationId: string;
}

export class CourierConfirmDeliveredUseCase {
    constructor(private transactionRunner: TransactionRunner) {}

    async execute(input: CourierConfirmDeliveredInput) {
        return this.transactionRunner.run(async ({ orderRepository, outboxRepository, auditLogRepository }) => {
            const order = await orderRepository.findById(input.orderId);
            if (!order) throw new Error('Order not found');

            if (order.deliveryClaimUserId !== input.userId) {
                throw new Error('Only the assigned courier can confirm delivery for this order');
            }

            const updated = confirmDelivered(order);
            await orderRepository.save(updated);

            // Publish ORDER_DELIVERED — triggers MoySklad export via outbox
            await outboxRepository.save({
                id: randomUUID(),
                eventType: 'ORDER_DELIVERED',
                payload: {
                    orderId: updated.id,
                    items: updated.items.map(i => ({
                        productId: i.productId,
                        article:   i.article,
                        name:      i.name,
                        price:     i.price,
                        quantity:  i.quantity,
                    })),
                },
            });

            await auditLogRepository.save({
                actorUserId: input.userId,
                actorRole: input.userRole,
                action: 'COURIER_CONFIRM_DELIVERED',
                targetType: 'Order',
                targetId: order.id,
                before: { state: order.state },
                after: { state: updated.state, deliveredAt: updated.deliveredAt },
                correlationId: input.correlationId,
            });

            return updated;
        });
    }
}
