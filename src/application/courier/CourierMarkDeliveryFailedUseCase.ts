import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { markDeliveryFailed } from '@/domain/order/transitions';

interface CourierMarkDeliveryFailedInput {
    orderId: string;
    userId: string;
    userRole: string;
    reason: string;
    correlationId: string;
}

export class CourierMarkDeliveryFailedUseCase {
    constructor(private transactionRunner: TransactionRunner) {}

    async execute(input: CourierMarkDeliveryFailedInput) {
        return this.transactionRunner.run(async ({ orderRepository, auditLogRepository }) => {
            const order = await orderRepository.findById(input.orderId);
            if (!order) throw new Error('Order not found');

            if (order.deliveryClaimUserId !== input.userId) {
                throw new Error('Only the assigned courier can mark delivery as failed');
            }

            // Returns to DELIVERY_ASSIGNED with claim cleared → available for reassignment
            const updated = markDeliveryFailed(order);
            await orderRepository.save(updated);

            await auditLogRepository.save({
                actorUserId: input.userId,
                actorRole: input.userRole,
                action: 'COURIER_DELIVERY_FAILED',
                targetType: 'Order',
                targetId: order.id,
                before: { state: order.state, deliveryClaimUserId: order.deliveryClaimUserId },
                after: { state: updated.state, deliveryClaimUserId: null },
                reason: input.reason,
                correlationId: input.correlationId,
            });

            return updated;
        });
    }
}
