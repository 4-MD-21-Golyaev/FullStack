import { type FavoriteRepository } from '@/application/ports/FavoriteRepository';
import { type ProductRepository } from '@/application/ports/ProductRepository';

export interface FavoriteProductView {
    id: string;
    name: string;
    price: number;
    imagePath: string | null;
    stock: number;
    categoryId: string;
}

export class GetFavoritesUseCase {
    constructor(
        private favoriteRepository: FavoriteRepository,
        private productRepository: ProductRepository,
    ) {}

    async execute(userId: string): Promise<FavoriteProductView[]> {
        const favorites = await this.favoriteRepository.findByUserId(userId);
        if (favorites.length === 0) return [];

        const products = await this.productRepository.findByIds(favorites.map(f => f.productId));
        const productMap = new Map(products.map(p => [p.id, p]));

        const views: FavoriteProductView[] = [];

        for (const favorite of favorites) {
            const product = productMap.get(favorite.productId);
            if (!product) continue;

            views.push({
                id: product.id,
                name: product.name,
                price: product.price,
                imagePath: product.imagePath,
                stock: product.stock,
                categoryId: product.categoryId,
            });
        }

        return views;
    }
}
