import { PaymentRepository } from '@/application/ports/PaymentRepository';
import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { cancelOrder } from '@/domain/order/transitions';
import { OrderState } from '@/domain/order/OrderState';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

interface PaymentTimeoutResult {
    cancelled: number;
    errors: number;
}

export class PaymentTimeoutUseCase {
    constructor(
        private paymentRepository: PaymentRepository,
        private transactionRunner: TransactionRunner,
    ) {}

    async execute(timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<PaymentTimeoutResult> {
        const cutoff = new Date(Date.now() - timeoutMs);

        // Read stale payments outside any transaction — just to get the list
        const stalePayments = await this.paymentRepository.findStalePending(cutoff);

        let cancelled = 0;
        let errors = 0;

        // Each cancellation runs in its own transaction to avoid blocking others on error
        for (const payment of stalePayments) {
            try {
                const didCancel = await this.transactionRunner.run(async ({ orderRepository, paymentRepository }) => {
                    // Re-read inside transaction to guard against race conditions
                    const freshPayment = await paymentRepository.findById(payment.id);

                    if (!freshPayment || freshPayment.status !== PaymentStatus.PENDING) {
                        return false; // Already processed by another concurrent request
                    }

                    const order = await orderRepository.findById(freshPayment.orderId);

                    if (!order || order.state !== OrderState.PAYMENT) {
                        return false; // Order already moved out of PAYMENT (e.g. succeeded)
                    }

                    freshPayment.status = PaymentStatus.FAILED;
                    await paymentRepository.save(freshPayment);

                    const cancelledOrder = cancelOrder(order);
                    await orderRepository.save(cancelledOrder);

                    return true;
                });

                if (didCancel) cancelled++;
            } catch {
                errors++;
            }
        }

        return { cancelled, errors };
    }
}
