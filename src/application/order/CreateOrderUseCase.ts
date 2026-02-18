import { OrderRepository } from '@/application/ports/OrderRepository';
import { ProductRepository } from '@/application/ports/ProductRepository';
import { createOrder } from '@/domain/order/transitions';
import { OrderItem } from '@/domain/order/OrderItem';
import { randomUUID } from 'crypto';

interface CreateOrderInput {
    userId: string;
    address: string;
    items: {
        productId: string;
        quantity: number;
    }[];
}

export class CreateOrderUseCase {

    constructor(
        private orderRepository: OrderRepository,
        private productRepository: ProductRepository
    ) {}

    async execute(input: CreateOrderInput) {

        const orderItems: OrderItem[] = [];

        for (const item of input.items) {

            const product = await this.productRepository.findById(item.productId);

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
            orderItems
        );

        await this.orderRepository.save(order);

        return order;
    }
}
