import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { cancelOrder, startDelivery } from '@/domain/order/transitions';
import { OrderState } from '@/domain/order/OrderState';
import { Payment } from '@/domain/payment/Payment';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Product } from '@/domain/product/Product';
import { randomUUID } from 'crypto';

interface PayOrderInput {
    orderId: string;
}

export class PayOrderUseCase {
    constructor(private transactionRunner: TransactionRunner) {}

    async execute(input: PayOrderInput) {
        return this.transactionRunner.run(async ({ orderRepository, paymentRepository, productRepository }) => {
            const order = await orderRepository.findByIdWithLock(input.orderId);

            if (!order) {
                throw new Error('Order not found');
            }

            // Идемпотентность: повторное уведомление об оплате уже обработанного заказа
            if (order.state === OrderState.DELIVERY || order.state === OrderState.CLOSED) {
                throw new Error('Payment already processed for this order');
            }

            // Блокируем и читаем все товары, проверяем остатки
            const products = new Map<string, Product>();

            for (const item of order.items) {
                const product = await productRepository.findByIdWithLock(item.productId);

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

            // Создаём запись об оплате
            const payment: Payment = {
                id: randomUUID(),
                orderId: order.id,
                amount: order.totalAmount,
                status: PaymentStatus.SUCCESS,
                createdAt: new Date(),
            };

            await paymentRepository.save(payment);

            // Списываем остатки из закешированных значений
            for (const item of order.items) {
                const product = products.get(item.productId)!;
                await productRepository.save({
                    ...product,
                    stock: product.stock - item.quantity,
                });
            }

            // Переводим заказ в доставку
            const updated = startDelivery(order);
            await orderRepository.save(updated);

            return { order: updated, payment };
        });
    }
}
