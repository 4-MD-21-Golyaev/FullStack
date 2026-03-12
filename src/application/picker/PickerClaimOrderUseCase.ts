import { OrderRepository } from '@/application/ports/OrderRepository';
import { AuditLogRepository } from '@/application/ports/AuditLogRepository';

interface PickerClaimOrderInput {
    orderId: string;
    userId: string;
    userRole: string;
    correlationId: string;
}

export class PickerClaimOrderUseCase {
    constructor(
        private orderRepository: OrderRepository,
        private auditLogRepository: AuditLogRepository,
    ) {}

    async execute(input: PickerClaimOrderInput): Promise<void> {
        const order = await this.orderRepository.findById(input.orderId);
        if (!order) throw new Error('Order not found');

        // Idempotent: already claimed by the same user
        if (order.pickerClaimUserId === input.userId) return;

        const claimed = await this.orderRepository.claimForPicker(input.orderId, input.userId);

        if (!claimed) {
            await this.auditLogRepository.save({
                actorUserId: input.userId,
                actorRole: input.userRole,
                action: 'PICKER_CLAIM_CONFLICT',
                targetType: 'Order',
                targetId: input.orderId,
                before: { pickerClaimUserId: order.pickerClaimUserId, state: order.state },
                correlationId: input.correlationId,
            });
            throw new Error('Order is already claimed by another picker or not in a claimable state');
        }

        await this.auditLogRepository.save({
            actorUserId: input.userId,
            actorRole: input.userRole,
            action: 'PICKER_CLAIM',
            targetType: 'Order',
            targetId: input.orderId,
            before: { pickerClaimUserId: null },
            after: { pickerClaimUserId: input.userId },
            correlationId: input.correlationId,
        });
    }
}
