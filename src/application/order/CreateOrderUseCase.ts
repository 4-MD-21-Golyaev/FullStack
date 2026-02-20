import { TransactionRunner } from '@/application/ports/TransactionRunner';
import { createOrder } from '@/domain/order/transitions';
import { OrderItem } from '@/domain/order/OrderItem';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';
import { randomUUID } from 'crypto';

interface CreateOrderInput {
    userId: string;
    address: string;
    absenceResolutionStrategy: AbsenceResolutionStrategy;
    items: {
        productId: string;
        quantity: number;
    }[];
}

export class CreateOrderUseCase {
    constructor(private transactionRunner: TransactionRunner) {}

    async execute(input: CreateOrderInput) {
        return this.transactionRunner.run(async ({ orderRepository, productRepository }) => {
            const orderItems: OrderItem[] = [];

            for (const item of input.items) {
                const product = await productRepository.findById(item.productId);

                if (!product) {
                    throw new Error(`Product ${item.productId} not found`);
                }

                if (item.quantity <= 0) {
                    throw new Error('Quantity must be greater than zero');
                }

                if (product.stock < item.quantity) {
                    throw new Error(`Insufficient stock for product ${product.id}`);
                }

                orderItems.push({
                    productId: product.id,
                    name: product.name,
                    article: product.article,
                    price: product.price,
                    quantity: item.quantity,
                });
            }

            const order = createOrder(
                randomUUID(),
                input.userId,
                input.address,
                orderItems,
                input.absenceResolutionStrategy
            );

            await orderRepository.save(order);

            return order;
        });
    }
}
