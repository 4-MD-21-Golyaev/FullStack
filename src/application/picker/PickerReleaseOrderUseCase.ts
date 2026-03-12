import { OrderRepository } from '@/application/ports/OrderRepository';
import { AuditLogRepository } from '@/application/ports/AuditLogRepository';

interface PickerReleaseOrderInput {
    orderId: string;
    userId: string;      // who is performing the release
    userRole: string;
    reason?: string;
    correlationId: string;
}

export class PickerReleaseOrderUseCase {
    constructor(
        private orderRepository: OrderRepository,
        private auditLogRepository: AuditLogRepository,
    ) {}

    async execute(input: PickerReleaseOrderInput): Promise<void> {
        const order = await this.orderRepository.findById(input.orderId);
        if (!order) throw new Error('Order not found');

        if (!order.pickerClaimUserId) return; // already released — idempotent

        const isAdmin = input.userRole === 'ADMIN';
        const isOwner = order.pickerClaimUserId === input.userId;

        if (!isOwner && !isAdmin) {
            await this.auditLogRepository.save({
                actorUserId: input.userId,
                actorRole: input.userRole,
                action: 'PICKER_RELEASE_FORBIDDEN',
                targetType: 'Order',
                targetId: input.orderId,
                before: { pickerClaimUserId: order.pickerClaimUserId },
                correlationId: input.correlationId,
            });
            throw new Error('Cannot release a claim owned by another picker. Only ADMIN can override.');
        }

        // ADMIN override requires reason
        if (isAdmin && !isOwner && !input.reason) {
            throw new Error('Admin override release requires a reason');
        }

        const requireUserId = isAdmin ? undefined : input.userId;
        await this.orderRepository.releasePickerClaim(input.orderId, requireUserId);

        await this.auditLogRepository.save({
            actorUserId: input.userId,
            actorRole: input.userRole,
            action: isAdmin && !isOwner ? 'PICKER_RELEASE_OVERRIDE' : 'PICKER_RELEASE',
            targetType: 'Order',
            targetId: input.orderId,
            before: { pickerClaimUserId: order.pickerClaimUserId },
            after: { pickerClaimUserId: null },
            reason: input.reason,
            correlationId: input.correlationId,
        });
    }
}
