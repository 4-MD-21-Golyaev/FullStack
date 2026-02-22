import { OrderRepository } from '@/application/ports/OrderRepository';
import { CartRepository } from '@/application/ports/CartRepository';

interface RepeatOrderToCartInput {
    orderId: string;
    userId: string;
}

interface RepeatOrderToCartResult {
    addedCount: number;
}

export class RepeatOrderToCartUseCase {
    constructor(
        private orderRepository: OrderRepository,
        private cartRepository: CartRepository,
    ) {}

    async execute(input: RepeatOrderToCartInput): Promise<RepeatOrderToCartResult> {
        const order = await this.orderRepository.findById(input.orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        if (order.userId !== input.userId) {
            throw new Error('Forbidden');
        }

        const cartItems = await this.cartRepository.findByUserId(input.userId);
        const cartMap = new Map(cartItems.map(i => [i.productId, i]));

        for (const item of order.items) {
            const existing = cartMap.get(item.productId);
            const newQuantity = existing ? existing.quantity + item.quantity : item.quantity;

            await this.cartRepository.save({
                userId: input.userId,
                productId: item.productId,
                quantity: newQuantity,
            });
        }

        return { addedCount: order.items.length };
    }
}
