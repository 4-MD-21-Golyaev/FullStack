import { CartRepository } from '@/application/ports/CartRepository';
import { ProductRepository } from '@/application/ports/ProductRepository';

export interface CartItemView {
    productId: string;
    name: string;
    article: string;
    price: number;
    imagePath: string | null;
    quantity: number;
}

export class GetCartUseCase {
    constructor(
        private cartRepository: CartRepository,
        private productRepository: ProductRepository,
    ) {}

    async execute(userId: string): Promise<CartItemView[]> {
        const items = await this.cartRepository.findByUserId(userId);
        const views: CartItemView[] = [];

        for (const item of items) {
            const product = await this.productRepository.findById(item.productId);
            if (!product) continue;

            views.push({
                productId: item.productId,
                name: product.name,
                article: product.article,
                price: product.price,
                imagePath: product.imagePath,
                quantity: item.quantity,
            });
        }

        return views;
    }
}
