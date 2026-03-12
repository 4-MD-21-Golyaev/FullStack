import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { startOutForDelivery } from '@/domain/order/transitions';
import { randomUUID } from 'crypto';

interface CourierStartDeliveryInput {
    orderId: string;
    userId: string;
    userRole: string;
    correlationId: string;
}

export class CourierStartDeliveryUseCase {
    constructor(private transactionRunner: TransactionRunner) {}

    async execute(input: CourierStartDeliveryInput) {
        return this.transactionRunner.run(async ({ orderRepository, auditLogRepository }) => {
            const order = await orderRepository.findById(input.orderId);
            if (!order) throw new Error('Order not found');

            if (order.deliveryClaimUserId !== input.userId) {
                throw new Error('Only the assigned courier can start delivery for this order');
            }

            const updated = startOutForDelivery(order);
            await orderRepository.save(updated);

            await auditLogRepository.save({
                actorUserId: input.userId,
                actorRole: input.userRole,
                action: 'COURIER_START_DELIVERY',
                targetType: 'Order',
                targetId: order.id,
                before: { state: order.state },
                after: { state: updated.state, outForDeliveryAt: updated.outForDeliveryAt },
                correlationId: input.correlationId,
            });

            return updated;
        });
    }
}
