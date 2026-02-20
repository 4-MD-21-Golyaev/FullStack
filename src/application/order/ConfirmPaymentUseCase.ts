import { PaymentRepository } from '@/application/ports/PaymentRepository';
import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { cancelOrder, startDelivery } from '@/domain/order/transitions';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Product } from '@/domain/product/Product';

type YookassaEvent = 'payment.succeeded' | 'payment.canceled';

interface ConfirmPaymentInput {
    externalId: string;
    event: YookassaEvent;
}

export class ConfirmPaymentUseCase {
    constructor(
        private paymentRepository: PaymentRepository,
        private transactionRunner: TransactionRunner,
    ) {}

    async execute(input: ConfirmPaymentInput) {
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

        return this.transactionRunner.run(async ({ orderRepository, paymentRepository, productRepository }) => {
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

                    // TODO: инициировать возврат через ЮKassa
                    throw new Error(
                        `Insufficient stock for "${item.name}" after payment — order cancelled, refund required`
                    );
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

            return { alreadyProcessed: false, order: updated, payment };
        });
    }
}
