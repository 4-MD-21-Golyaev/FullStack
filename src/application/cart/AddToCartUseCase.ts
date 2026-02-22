import { CartRepository } from '@/application/ports/CartRepository';
import { ProductRepository } from '@/application/ports/ProductRepository';

export interface AddToCartInput {
    userId: string;
    productId: string;
    quantity: number;
}

export class AddToCartUseCase {
    constructor(
        private cartRepository: CartRepository,
        private productRepository: ProductRepository,
    ) {}

    async execute(input: AddToCartInput): Promise<void> {
        if (input.quantity <= 0) {
            throw new Error('Quantity must be positive');
        }

        const product = await this.productRepository.findById(input.productId);
        if (!product) {
            throw new Error(`Product ${input.productId} not found`);
        }

        const existing = await this.cartRepository.findByUserAndProduct(input.userId, input.productId);
        const newQuantity = existing ? existing.quantity + input.quantity : input.quantity;

        if (newQuantity > product.stock) {
            throw new Error('Insufficient stock');
        }

        await this.cartRepository.save({
            userId: input.userId,
            productId: input.productId,
            quantity: newQuantity,
        });
    }
}
