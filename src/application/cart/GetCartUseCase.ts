import { CartRepository } from '@/application/ports/CartRepository';
import { ProductRepository } from '@/application/ports/ProductRepository';

export interface CartItemView {
    productId: string;
    name: string;
    article: string;
    price: number;
    stock: number;
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
        if (items.length === 0) return [];

        const products = await this.productRepository.findByIds(items.map(i => i.productId));
        const productMap = new Map(products.map(p => [p.id, p]));

        const views: CartItemView[] = [];

        for (const item of items) {
            const product = productMap.get(item.productId);
            if (!product) continue;

            views.push({
                productId: item.productId,
                name: product.name,
                article: product.article,
                price: product.price,
                stock: product.stock,
                imagePath: product.imagePath,
                quantity: item.quantity,
            });
        }

        return views;
    }
}
