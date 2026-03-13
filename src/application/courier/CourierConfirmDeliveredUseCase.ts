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
        return this.transactionRunner.run(async ({ orderRepository, auditLogRepository, outboxRepository }) => {
            const order = await orderRepository.findById(input.orderId);
            if (!order) throw new Error('Order not found');

            if (order.deliveryClaimUserId !== input.userId) {
                throw new Error('Only the assigned courier can confirm delivery for this order');
            }

            const updated = confirmDelivered(order);
            await orderRepository.save(updated);

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

            await outboxRepository.save({
                id: randomUUID(),
                eventType: 'ORDER_COMPLETED',
                payload: {
                    orderId: updated.id,
                },
            });

            return updated;
        });
    }
}
