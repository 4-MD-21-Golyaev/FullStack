import { OrderRepository } from '@/application/ports/OrderRepository';
import { AuditLogRepository } from '@/application/ports/AuditLogRepository';

interface CourierReleaseOrderInput {
    orderId: string;
    userId: string;
    userRole: string;
    reason?: string;
    correlationId: string;
}

export class CourierReleaseOrderUseCase {
    constructor(
        private orderRepository: OrderRepository,
        private auditLogRepository: AuditLogRepository,
    ) {}

    async execute(input: CourierReleaseOrderInput): Promise<void> {
        const order = await this.orderRepository.findById(input.orderId);
        if (!order) throw new Error('Order not found');

        if (!order.deliveryClaimUserId) return; // already released — idempotent

        const isAdmin = input.userRole === 'ADMIN';
        const isOwner = order.deliveryClaimUserId === input.userId;

        if (!isOwner && !isAdmin) {
            await this.auditLogRepository.save({
                actorUserId: input.userId,
                actorRole: input.userRole,
                action: 'COURIER_RELEASE_FORBIDDEN',
                targetType: 'Order',
                targetId: input.orderId,
                before: { deliveryClaimUserId: order.deliveryClaimUserId },
                correlationId: input.correlationId,
            });
            throw new Error('Cannot release a claim owned by another courier. Only ADMIN can override.');
        }

        if (isAdmin && !isOwner && !input.reason) {
            throw new Error('Admin override release requires a reason');
        }

        const requireUserId = isAdmin ? undefined : input.userId;
        await this.orderRepository.releaseCourierClaim(input.orderId, requireUserId);

        await this.auditLogRepository.save({
            actorUserId: input.userId,
            actorRole: input.userRole,
            action: isAdmin && !isOwner ? 'COURIER_RELEASE_OVERRIDE' : 'COURIER_RELEASE',
            targetType: 'Order',
            targetId: input.orderId,
            before: { deliveryClaimUserId: order.deliveryClaimUserId },
            after: { deliveryClaimUserId: null },
            reason: input.reason,
            correlationId: input.correlationId,
        });
    }
}
