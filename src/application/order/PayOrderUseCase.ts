import { OrderRepository } from '@/application/ports/OrderRepository';
import { PaymentRepository } from '@/application/ports/PaymentRepository';
import { ProductRepository } from '@/application/ports/ProductRepository';
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
    constructor(
        private orderRepository: OrderRepository,
        private paymentRepository: PaymentRepository,
        private productRepository: ProductRepository
    ) {}

    async execute(input: PayOrderInput) {
        const order = await this.orderRepository.findById(input.orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        // Идемпотентность: повторное уведомление об оплате уже обработанного заказа
        if (order.state === OrderState.DELIVERY || order.state === OrderState.CLOSED) {
            throw new Error('Payment already processed for this order');
        }

        // Проверяем наличие остатков по всем позициям заказа
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

        // Создаём запись об оплате
        const payment: Payment = {
            id: randomUUID(),
            orderId: order.id,
            amount: order.totalAmount,
            status: PaymentStatus.SUCCESS,
            createdAt: new Date(),
        };

        await this.paymentRepository.save(payment);

        // Списываем остатки
        for (const item of order.items) {
            const product = products.get(item.productId)!;
            await this.productRepository.save({
                ...product,
                stock: product.stock - item.quantity,
            });
        }

        // Переводим заказ в доставку
        const updated = startDelivery(order);
        await this.orderRepository.save(updated);

        return { order: updated, payment };
    }
}
