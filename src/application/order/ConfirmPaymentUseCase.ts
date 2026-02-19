import { OrderRepository } from '@/application/ports/OrderRepository';
import { PaymentRepository } from '@/application/ports/PaymentRepository';
import { ProductRepository } from '@/application/ports/ProductRepository';
import { cancelOrder, startDelivery } from '@/domain/order/transitions';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';

type YookassaEvent = 'payment.succeeded' | 'payment.canceled';

interface ConfirmPaymentInput {
    externalId: string;
    event: YookassaEvent;
}

export class ConfirmPaymentUseCase {
    constructor(
        private orderRepository: OrderRepository,
        private paymentRepository: PaymentRepository,
        private productRepository: ProductRepository
    ) {}

    async execute(input: ConfirmPaymentInput) {
        const payment = await this.paymentRepository.findByExternalId(input.externalId);

        if (!payment) {
            throw new Error(`Payment with externalId "${input.externalId}" not found`);
        }

        // Идемпотентность: вебхук пришёл повторно — ничего не делаем
        if (
            payment.status === PaymentStatus.SUCCESS ||
            payment.status === PaymentStatus.FAILED
        ) {
            return { alreadyProcessed: true };
        }

        const order = await this.orderRepository.findById(payment.orderId);

        if (!order) {
            throw new Error(`Order "${payment.orderId}" not found`);
        }

        if (input.event === 'payment.canceled') {
            payment.status = PaymentStatus.FAILED;
            await this.paymentRepository.save(payment);

            const cancelled = cancelOrder(order);
            await this.orderRepository.save(cancelled);

            return { alreadyProcessed: false, order: cancelled, payment };
        }

        // payment.succeeded — проверяем остатки повторно (могли измениться)
        for (const item of order.items) {
            const product = await this.productRepository.findById(item.productId);

            if (!product || product.stock < item.quantity) {
                payment.status = PaymentStatus.FAILED;
                await this.paymentRepository.save(payment);

                const cancelled = cancelOrder(order);
                await this.orderRepository.save(cancelled);

                // TODO: инициировать возврат через ЮKassa
                throw new Error(
                    `Insufficient stock for "${item.name}" after payment — order cancelled, refund required`
                );
            }
        }

        // Списываем остатки
        for (const item of order.items) {
            const product = (await this.productRepository.findById(item.productId))!;
            await this.productRepository.save({
                ...product,
                stock: product.stock - item.quantity,
            });
        }

        // Обновляем статус платежа
        payment.status = PaymentStatus.SUCCESS;
        await this.paymentRepository.save(payment);

        // Переводим заказ в доставку
        const updated = startDelivery(order);
        await this.orderRepository.save(updated);

        return { alreadyProcessed: false, order: updated, payment };
    }
}
