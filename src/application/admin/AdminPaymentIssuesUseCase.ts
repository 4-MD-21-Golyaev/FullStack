import { PaymentRepository } from '@/application/ports/PaymentRepository';
import { OrderRepository } from '@/application/ports/OrderRepository';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { OrderState } from '@/domain/order/OrderState';

export interface PaymentIssueRow {
    paymentId: string;
    orderId: string;
    orderState: string;
    paymentStatus: string;
    amount: number;
    externalId?: string;
    createdAt: Date;
}

export class AdminPaymentIssuesUseCase {
    constructor(
        private paymentRepository: PaymentRepository,
        private orderRepository: OrderRepository,
    ) {}

    async execute(): Promise<PaymentIssueRow[]> {
        // Pending payments (waiting for user action or stuck)
        const staleCutoff = new Date(Date.now() - 5 * 60 * 1000); // older than 5 min is an issue
        const pendingPayments = await this.paymentRepository.findStalePending(staleCutoff);

        const rows: PaymentIssueRow[] = [];

        for (const payment of pendingPayments) {
            const order = await this.orderRepository.findById(payment.orderId);
            rows.push({
                paymentId: payment.id,
                orderId: payment.orderId,
                orderState: order?.state ?? 'UNKNOWN',
                paymentStatus: payment.status,
                amount: payment.amount,
                externalId: payment.externalId,
                createdAt: payment.createdAt,
            });
        }

        return rows;
    }
}
