import { OrderRepository } from '@/application/ports/OrderRepository';
import { PaymentRepository } from '@/application/ports/PaymentRepository';
import { PaymentGateway } from '@/application/ports/PaymentGateway';
import { ProductRepository } from '@/application/ports/ProductRepository';
import { cancelOrder } from '@/domain/order/transitions';
import { OrderState } from '@/domain/order/OrderState';
import { Payment } from '@/domain/payment/Payment';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Product } from '@/domain/product/Product';
import { randomUUID } from 'crypto';

interface InitiatePaymentInput {
    orderId: string;
    returnUrl: string;
}

export class InitiatePaymentUseCase {
    constructor(
        private orderRepository: OrderRepository,
        private paymentRepository: PaymentRepository,
        private productRepository: ProductRepository,
        private paymentGateway: PaymentGateway
    ) {}

    async execute(input: InitiatePaymentInput) {
        const order = await this.orderRepository.findById(input.orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        // Идемпотентность: оплата уже была обработана
        if (order.state === OrderState.DELIVERY || order.state === OrderState.CLOSED) {
            throw new Error('Payment already processed for this order');
        }

        // §10: не допускаем второй PENDING-платёж для одного заказа
        const existingPending = await this.paymentRepository.findPendingByOrderId(input.orderId);
        if (existingPending) {
            throw new Error('Payment already in progress for this order');
        }

        // Проверяем остатки всех позиций
        const products = new Map<string, Product>();

        for (const item of order.items) {
            const product = await this.productRepository.findById(item.productId);

            if (!product) {
                const cancelled = cancelOrder(order);
                await this.orderRepository.save(cancelled);
                throw new Error(
                    `Product "${item.productId}" not found — order cancelled`
                );
            }

            if (product.stock < item.quantity) {
                const cancelled = cancelOrder(order);
                await this.orderRepository.save(cancelled);
                throw new Error(
                    `Insufficient stock for "${product.name}": ` +
                    `required ${item.quantity}, available ${product.stock} — order cancelled`
                );
            }

            products.set(item.productId, product);
        }

        // Создаём запись платежа со статусом PENDING
        const payment: Payment = {
            id: randomUUID(),
            orderId: order.id,
            amount: order.totalAmount,
            status: PaymentStatus.PENDING,
            createdAt: new Date(),
        };

        await this.paymentRepository.save(payment);

        // Создаём платёж в ЮKassa (наш payment.id — idempotency key)
        const created = await this.paymentGateway.createPayment({
            internalPaymentId: payment.id,
            orderId: order.id,
            amount: order.totalAmount,
            description: `Заказ №${order.id.slice(0, 8)}`,
            returnUrl: input.returnUrl,
        });

        // Сохраняем externalId от ЮKassa — новый объект, не мутируем
        await this.paymentRepository.save({ ...payment, externalId: created.externalId });

        return { confirmationUrl: created.confirmationUrl };
    }
}
