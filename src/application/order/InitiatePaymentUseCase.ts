import { OrderRepository } from '@/application/ports/OrderRepository';
import { PaymentRepository } from '@/application/ports/PaymentRepository';
import { PaymentGateway } from '@/application/ports/PaymentGateway';
import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { cancelOrder } from '@/domain/order/transitions';
import { OrderState } from '@/domain/order/OrderState';
import { Payment } from '@/domain/payment/Payment';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { PaymentWindowExpiredError } from '@/domain/payment/errors';
import { isPaymentWindowExpired } from '@/domain/payment/paymentTimeout';
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
        private paymentGateway: PaymentGateway,
        private transactionRunner: TransactionRunner,
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

        // Окно оплаты истекло: заказ слишком долго находится в состоянии PAYMENT
        if (order.state === OrderState.PAYMENT && isPaymentWindowExpired(order.updatedAt)) {
            await this.transactionRunner.run(async ({ orderRepository }) => {
                const freshOrder = await orderRepository.findById(input.orderId);
                if (freshOrder && freshOrder.state === OrderState.PAYMENT) {
                    await orderRepository.save(cancelOrder(freshOrder));
                }
            });
            throw new PaymentWindowExpiredError();
        }

        // Транзакционно: проверяем PENDING-дубль, остатки, при необходимости
        // отменяем заказ и создаём PENDING-запись платежа.
        // Serializable isolation + DB unique index на pendingOrderLock предотвращают гонку.
        const payment = await this.transactionRunner.run(async ({ orderRepository, productRepository, paymentRepository }) => {
            // §10: проверка внутри транзакции — атомарна с последующим INSERT
            // Идемпотентность: если PENDING уже существует — возвращаем его,
            // gateway вызовем с тем же internalPaymentId (idempotency key).
            const existingPending = await paymentRepository.findPendingByOrderId(input.orderId);
            if (existingPending) {
                return existingPending;
            }

            const products = new Map<string, Product>();

            for (const item of order.items) {
                const product = await productRepository.findById(item.productId);

                if (!product) {
                    const cancelled = cancelOrder(order);
                    await orderRepository.save(cancelled);
                    throw new Error(
                        `Product "${item.productId}" not found — order cancelled`
                    );
                }

                if (product.stock < item.quantity) {
                    const cancelled = cancelOrder(order);
                    await orderRepository.save(cancelled);
                    throw new Error(
                        `Insufficient stock for "${product.name}": ` +
                        `required ${item.quantity}, available ${product.stock} — order cancelled`
                    );
                }

                products.set(item.productId, product);
            }

            const payment: Payment = {
                id: randomUUID(),
                orderId: order.id,
                amount: order.totalAmount,
                status: PaymentStatus.PENDING,
                createdAt: new Date(),
            };

            await paymentRepository.save(payment);

            return payment;
        });

        // Создаём платёж в ЮKassa (наш payment.id — idempotency key)
        // Вызов внешнего сервиса выполняется вне транзакции
        let created;
        try {
            created = await this.paymentGateway.createPayment({
                internalPaymentId: payment.id,
                orderId: order.id,
                amount: order.totalAmount,
                description: `Заказ №${order.id.slice(0, 8)}`,
                returnUrl: input.returnUrl,
            });
        } catch (gatewayError) {
            // Компенсация: переводим PENDING в FAILED, чтобы не блокировать повторную оплату.
            // pendingOrderLock при этом сбрасывается в NULL (PaymentRepository.save).
            await this.paymentRepository.save({ ...payment, status: PaymentStatus.FAILED });
            throw gatewayError;
        }

        // Сохраняем externalId от ЮKassa — новый объект, не мутируем
        await this.paymentRepository.save({ ...payment, externalId: created.externalId });

        return { confirmationUrl: created.confirmationUrl };
    }
}
