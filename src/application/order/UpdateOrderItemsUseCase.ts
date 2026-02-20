import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { Order } from '@/domain/order/Order';
import { OrderItem } from '@/domain/order/OrderItem';
import { OrderState } from '@/domain/order/OrderState';
import { InvalidOrderStateError } from '@/domain/order/errors';

interface UpdateOrderItemsInput {
    orderId: string;
    items: { productId: string; quantity: number }[];
}

export class UpdateOrderItemsUseCase {
    constructor(private transactionRunner: TransactionRunner) {}

    async execute(input: UpdateOrderItemsInput): Promise<Order> {
        return this.transactionRunner.run(async ({ orderRepository, productRepository }) => {
            const order = await orderRepository.findById(input.orderId);

            if (!order) {
                throw new Error('Order not found');
            }

            if (order.state !== OrderState.PICKING) {
                throw new InvalidOrderStateError(
                    'Order items can only be updated while the order is in PICKING state'
                );
            }

            if (!input.items || input.items.length === 0) {
                throw new Error('Order must contain at least one item');
            }

            // Preserve existing snapshots (name, article, price fixed at order creation)
            // for items already in the order; fetch from product only for new positions.
            const existingByProductId = new Map(order.items.map(i => [i.productId, i]));
            const newItems: OrderItem[] = [];

            for (const { productId, quantity } of input.items) {
                if (quantity <= 0) {
                    throw new Error('Item quantity must be positive');
                }

                const existing = existingByProductId.get(productId);

                if (existing) {
                    // Keep original snapshot, only update quantity
                    newItems.push({ ...existing, quantity });
                } else {
                    // New product added during picking — snapshot current product data
                    const product = await productRepository.findById(productId);

                    if (!product) {
                        throw new Error(`Product ${productId} not found`);
                    }

                    newItems.push({
                        productId: product.id,
                        name: product.name,
                        article: product.article,
                        price: product.price,
                        quantity,
                    });
                }
            }

            const totalAmount = newItems.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            );

            const updated: Order = {
                ...order,
                items: newItems,
                totalAmount,
                updatedAt: new Date(),
            };

            await orderRepository.save(updated);

            return updated;
        });
    }
}
