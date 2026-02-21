import { CartRepository } from '@/application/ports/CartRepository';
import { ProductRepository } from '@/application/ports/ProductRepository';

export interface UpdateCartItemInput {
    userId: string;
    productId: string;
    quantity: number;
}

export class UpdateCartItemUseCase {
    constructor(
        private cartRepository: CartRepository,
        private productRepository: ProductRepository,
    ) {}

    async execute(input: UpdateCartItemInput): Promise<void> {
        if (input.quantity <= 0) {
            throw new Error('Quantity must be positive');
        }

        const product = await this.productRepository.findById(input.productId);
        if (!product) {
            throw new Error(`Product ${input.productId} not found`);
        }

        const existing = await this.cartRepository.findByUserAndProduct(input.userId, input.productId);
        if (!existing) {
            throw new Error('Cart item not found');
        }

        await this.cartRepository.save({
            userId: input.userId,
            productId: input.productId,
            quantity: input.quantity,
        });
    }
}
