import { OrderRepository } from '@/application/ports/OrderRepository';
import { AuditLogRepository } from '@/application/ports/AuditLogRepository';

interface CourierClaimOrderInput {
    orderId: string;
    userId: string;
    userRole: string;
    correlationId: string;
}

export class CourierClaimOrderUseCase {
    constructor(
        private orderRepository: OrderRepository,
        private auditLogRepository: AuditLogRepository,
    ) {}

    async execute(input: CourierClaimOrderInput): Promise<void> {
        const order = await this.orderRepository.findById(input.orderId);
        if (!order) throw new Error('Order not found');

        // Idempotent: already claimed by the same user
        if (order.deliveryClaimUserId === input.userId) return;

        const claimed = await this.orderRepository.claimForCourier(input.orderId, input.userId);

        if (!claimed) {
            await this.auditLogRepository.save({
                actorUserId: input.userId,
                actorRole: input.userRole,
                action: 'COURIER_CLAIM_CONFLICT',
                targetType: 'Order',
                targetId: input.orderId,
                before: { deliveryClaimUserId: order.deliveryClaimUserId, state: order.state },
                correlationId: input.correlationId,
            });
            throw new Error('Order is already claimed by another courier or not in DELIVERY state');
        }

        await this.auditLogRepository.save({
            actorUserId: input.userId,
            actorRole: input.userRole,
            action: 'COURIER_CLAIM',
            targetType: 'Order',
            targetId: input.orderId,
            before: { deliveryClaimUserId: null },
            after: { deliveryClaimUserId: input.userId },
            correlationId: input.correlationId,
        });
    }
}
