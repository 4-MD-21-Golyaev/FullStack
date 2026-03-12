import { AuditLogRepository } from '@/application/ports/AuditLogRepository';
import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';

interface AdminMarkPaymentFailedInput {
    paymentId: string;
    reason: string;
    actorUserId: string;
    actorRole: string;
    correlationId: string;
}

export class AdminMarkPaymentFailedUseCase {
    constructor(private transactionRunner: TransactionRunner) {}

    async execute(input: AdminMarkPaymentFailedInput): Promise<void> {
        await this.transactionRunner.run(async ({ paymentRepository, auditLogRepository }) => {
            // Re-check inside transaction: race with webhook SUCCESS is resolved by
            // serializable isolation — whoever commits first wins.
            const payment = await paymentRepository.findById(input.paymentId);

            if (!payment) throw new Error('Payment not found');

            // SUCCESS webhook already committed — this becomes a no-op
            if (payment.status === PaymentStatus.SUCCESS) {
                return; // idempotent: payment already succeeded, ignore admin action
            }

            if (payment.status !== PaymentStatus.PENDING) {
                throw new Error(
                    `Cannot mark payment as failed: current status is ${payment.status}. ` +
                    `Only PENDING payments can be marked failed.`
                );
            }

            await paymentRepository.save({ ...payment, status: PaymentStatus.FAILED });

            await auditLogRepository.save({
                actorUserId: input.actorUserId,
                actorRole: input.actorRole,
                action: 'PAYMENT_MARK_FAILED',
                targetType: 'Payment',
                targetId: payment.id,
                before: { status: PaymentStatus.PENDING },
                after: { status: PaymentStatus.FAILED },
                reason: input.reason,
                correlationId: input.correlationId,
            });
        });
    }
}
