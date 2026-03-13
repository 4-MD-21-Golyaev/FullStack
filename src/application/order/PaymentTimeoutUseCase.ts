import { PaymentRepository } from '@/application/ports/PaymentRepository';
import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { PAYMENT_TIMEOUT_MS } from '@/domain/payment/paymentTimeout';

interface PaymentTimeoutResult {
    expired: number;
    errors: number;
}

export class PaymentTimeoutUseCase {
    constructor(
        private paymentRepository: PaymentRepository,
        private transactionRunner: TransactionRunner,
    ) {}

    async execute(timeoutMs: number = PAYMENT_TIMEOUT_MS): Promise<PaymentTimeoutResult> {
        const cutoff = new Date(Date.now() - timeoutMs);

        // Read stale payments outside any transaction — just to get the list
        const stalePayments = await this.paymentRepository.findStalePending(cutoff);

        let expired = 0;
        let errors = 0;

        // Each expiration runs in its own transaction to avoid blocking others on error
        for (const payment of stalePayments) {
            try {
                const didExpire = await this.transactionRunner.run(async ({ paymentRepository }) => {
                    // Re-read inside transaction to guard against race conditions
                    const freshPayment = await paymentRepository.findById(payment.id);

                    if (!freshPayment || freshPayment.status !== PaymentStatus.PENDING) {
                        return false; // Already processed by another concurrent request
                    }

                    freshPayment.status = PaymentStatus.FAILED;
                    await paymentRepository.save(freshPayment);

                    return true;
                });

                if (didExpire) expired++;
            } catch (err) {
                console.error('[PaymentTimeoutUseCase] error expiring payment', payment.id, err);
                errors++;
            }
        }

        return { expired, errors };
    }
}
