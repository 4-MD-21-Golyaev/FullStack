import { PaymentRepository } from '@/application/ports/PaymentRepository';
import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { PaymentGateway } from '@/application/ports/PaymentGateway';
import { cancelOrder, startDelivery } from '@/domain/order/transitions';
import { Order } from '@/domain/order/Order';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Payment } from '@/domain/payment/Payment';
import { Product } from '@/domain/product/Product';
import { randomUUID } from 'crypto';

type ConfirmPaymentResult = {
    alreadyProcessed: boolean;
    order?: Order;
    payment?: Payment;
};

type YookassaEvent = 'payment.succeeded' | 'payment.canceled';

interface ConfirmPaymentInput {
    externalId: string;
    event: YookassaEvent;
}

export class ConfirmPaymentUseCase {
    constructor(
        private paymentRepository: PaymentRepository,
        private transactionRunner: TransactionRunner,
        private paymentGateway?: PaymentGateway,
    ) {}

    async execute(input: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
        // Быстрая проверка идемпотентности вне транзакции — избегаем лишних затрат
        const preCheck = await this.paymentRepository.findByExternalId(input.externalId);

        if (!preCheck) {
            throw new Error(`Payment with externalId "${input.externalId}" not found`);
        }

        if (
            preCheck.status === PaymentStatus.SUCCESS ||
            preCheck.status === PaymentStatus.FAILED
        ) {
            return { alreadyProcessed: true };
        }

        // Capture refund info if stock shortage occurs inside the transaction
        let refundExternalId: string | null = null;
        let refundAmount = 0;
        let refundIdempotencyKey = '';

        const result = await this.transactionRunner.run(async ({ orderRepository, paymentRepository, productRepository, outboxRepository }) => {
            const payment = await paymentRepository.findByExternalId(input.externalId);

            if (!payment) {
                throw new Error(`Payment with externalId "${input.externalId}" not found`);
            }

            // Повторная проверка внутри транзакции
            if (
                payment.status === PaymentStatus.SUCCESS ||
                payment.status === PaymentStatus.FAILED
            ) {
                return { alreadyProcessed: true };
            }

            const order = await orderRepository.findById(payment.orderId);

            if (!order) {
                throw new Error(`Order "${payment.orderId}" not found`);
            }

            if (input.event === 'payment.canceled') {
                payment.status = PaymentStatus.FAILED;
                await paymentRepository.save(payment);

                const cancelled = cancelOrder(order);
                await orderRepository.save(cancelled);

                return { alreadyProcessed: false, order: cancelled, payment };
            }

            // payment.succeeded — читаем и проверяем остатки всех товаров
            const products = new Map<string, Product>();

            for (const item of order.items) {
                const product = await productRepository.findById(item.productId);

                if (!product || product.stock < item.quantity) {
                    payment.status = PaymentStatus.FAILED;
                    await paymentRepository.save(payment);

                    const cancelled = cancelOrder(order);
                    await orderRepository.save(cancelled);

                    // Schedule refund outside the transaction (external API call)
                    if (payment.externalId) {
                        refundExternalId = payment.externalId;
                        refundAmount = payment.amount;
                        refundIdempotencyKey = `${payment.id}-refund`;
                    }

                    return { alreadyProcessed: false, order: cancelled, payment };
                }

                products.set(item.productId, product);
            }

            // Списываем остатки из закешированных значений (без повторных чтений)
            for (const item of order.items) {
                const product = products.get(item.productId)!;
                await productRepository.save({
                    ...product,
                    stock: product.stock - item.quantity,
                });
            }

            payment.status = PaymentStatus.SUCCESS;
            await paymentRepository.save(payment);

            const updated = startDelivery(order);
            await orderRepository.save(updated);

            // ORDER_READY_FOR_DELIVERY: уведомляем о готовности к доставке.
            // ORDER_DELIVERED публикуется позже — только после физического вручения курьером.
            await outboxRepository.save({
                id: randomUUID(),
                eventType: 'ORDER_READY_FOR_DELIVERY',
                payload: {
                    orderId: updated.id,
                    items: updated.items.map(i => ({
                        productId: i.productId,
                        article:   i.article,
                        name:      i.name,
                        price:     i.price,
                        quantity:  i.quantity,
                    })),
                },
            });

            return { alreadyProcessed: false, order: updated, payment };
        });

        // Compensation refund: initiated after DB transaction commits to avoid mixing external
        // API calls with DB writes. Non-fatal if it fails — ops team should monitor logs.
        if (refundExternalId && this.paymentGateway) {
            try {
                await this.paymentGateway.refundPayment({
                    externalId: refundExternalId,
                    amount: refundAmount,
                    idempotencyKey: refundIdempotencyKey,
                });
            } catch (err) {
                console.error('[ConfirmPayment] refund failed — manual intervention required', {
                    externalId: refundExternalId,
                    amount: refundAmount,
                    error: (err as Error).message,
                });
            }
        }

        return result;
    }
}
