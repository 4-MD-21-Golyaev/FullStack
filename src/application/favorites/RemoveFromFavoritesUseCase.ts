import { type FavoriteRepository } from '@/application/ports/FavoriteRepository';

export interface RemoveFromFavoritesInput {
    userId: string;
    productId: string;
}

export class RemoveFromFavoritesUseCase {
    constructor(private favoriteRepository: FavoriteRepository) {}

    async execute(input: RemoveFromFavoritesInput): Promise<void> {
        if (!input.productId) return;
        await this.favoriteRepository.remove(input.userId, input.productId);
    }
}
