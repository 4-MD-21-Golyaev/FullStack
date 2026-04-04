import { type FavoriteRepository } from '@/application/ports/FavoriteRepository';
import { type ProductRepository } from '@/application/ports/ProductRepository';

export interface AddToFavoritesInput {
    userId: string;
    productId: string;
}

export class AddToFavoritesUseCase {
    constructor(
        private favoriteRepository: FavoriteRepository,
        private productRepository: ProductRepository,
    ) {}

    async execute(input: AddToFavoritesInput): Promise<void> {
        if (!input.productId) {
            throw new Error('Product id is required');
        }

        const product = await this.productRepository.findById(input.productId);
        if (!product) {
            throw new Error(`Product ${input.productId} not found`);
        }

        const existing = await this.favoriteRepository.findByUserAndProduct(input.userId, input.productId);
        if (existing) return;

        await this.favoriteRepository.save({
            userId: input.userId,
            productId: input.productId,
            createdAt: new Date(),
        });
    }
}
