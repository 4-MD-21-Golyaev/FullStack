import { OrderRepository } from '@/application/ports/OrderRepository';
import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { cancelOrder } from '@/domain/order/transitions';
import { OrderState } from '@/domain/order/OrderState';

const DEFAULT_ORDER_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

interface OrderPaymentTimeoutResult {
    cancelled: number;
    errors: number;
}

export class OrderPaymentTimeoutUseCase {
    constructor(
        private orderRepository: OrderRepository,
        private transactionRunner: TransactionRunner,
    ) {}

    async execute(timeoutMs = DEFAULT_ORDER_TIMEOUT_MS): Promise<OrderPaymentTimeoutResult> {
        const cutoff = new Date(Date.now() - timeoutMs);
        const staleOrders = await this.orderRepository.findStaleInPayment(cutoff);

        let cancelled = 0;
        let errors = 0;

        for (const order of staleOrders) {
            try {
                const didCancel = await this.transactionRunner.run(async ({ orderRepository, paymentRepository }) => {
                    const freshOrder = await orderRepository.findById(order.id);
                    if (!freshOrder || freshOrder.state !== OrderState.PAYMENT) return false;

                    // If there's an active payment attempt, skip — the user may still complete it.
                    // PaymentTimeoutUseCase will expire it after 10 min; on the next cron run
                    // this order will be cancelled (no longer has a PENDING payment).
                    const pendingPayment = await paymentRepository.findPendingByOrderId(order.id);
                    if (pendingPayment) return false;

                    const cancelledOrder = cancelOrder(freshOrder);
                    await orderRepository.save(cancelledOrder);
                    return true;
                });

                if (didCancel) cancelled++;
            } catch (err) {
                console.error('[OrderPaymentTimeout] error cancelling order', order.id, err);
                errors++;
            }
        }

        return { cancelled, errors };
    }
}
