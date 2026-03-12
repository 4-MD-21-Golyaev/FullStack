import { PaymentRepository } from '@/application/ports/PaymentRepository';
import { PaymentGateway } from '@/application/ports/PaymentGateway';
import { OrderRepository } from '@/application/ports/OrderRepository';
import { AuditLogRepository } from '@/application/ports/AuditLogRepository';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Payment } from '@/domain/payment/Payment';
import { randomUUID } from 'crypto';

interface AdminRetryPaymentInput {
    paymentId: string;
    actorUserId: string;
    actorRole: string;
    correlationId: string;
    returnUrl: string;
}

export class AdminRetryPaymentUseCase {
    constructor(
        private paymentRepository: PaymentRepository,
        private orderRepository: OrderRepository,
        private paymentGateway: PaymentGateway,
        private auditLogRepository: AuditLogRepository,
    ) {}

    async execute(input: AdminRetryPaymentInput) {
        const payment = await this.paymentRepository.findById(input.paymentId);
        if (!payment) throw new Error('Payment not found');

        if (payment.status !== PaymentStatus.PENDING) {
            throw new Error(`Cannot retry payment in status ${payment.status}. Only PENDING payments can be retried.`);
        }

        const order = await this.orderRepository.findById(payment.orderId);
        if (!order) throw new Error('Order not found');

        // Trigger Yookassa retry (send confirmation link again)
        let confirmationUrl: string | undefined;
        try {
            const result = await this.paymentGateway.createPayment({
                internalPaymentId: payment.id, // same idempotency key
                orderId: order.id,
                amount: payment.amount,
                description: `Заказ №${order.id.slice(0, 8)} (повтор)`,
                returnUrl: input.returnUrl,
            });
            confirmationUrl = result.confirmationUrl;
        } catch (e: any) {
            await this.auditLogRepository.save({
                actorUserId: input.actorUserId,
                actorRole: input.actorRole,
                action: 'PAYMENT_RETRY_FAILED',
                targetType: 'Payment',
                targetId: payment.id,
                before: { status: payment.status },
                reason: e.message,
                correlationId: input.correlationId,
            });
            throw e;
        }

        await this.auditLogRepository.save({
            actorUserId: input.actorUserId,
            actorRole: input.actorRole,
            action: 'PAYMENT_RETRY',
            targetType: 'Payment',
            targetId: payment.id,
            before: { status: payment.status },
            after: { status: payment.status, retriggered: true },
            correlationId: input.correlationId,
        });

        return { confirmationUrl };
    }
}
