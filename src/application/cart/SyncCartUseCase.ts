import { CartRepository } from '@/application/ports/CartRepository';
import { ProductRepository } from '@/application/ports/ProductRepository';

export interface SyncCartInput {
    userId: string;
    items: { productId: string; quantity: number }[];
}

export class SyncCartUseCase {
    constructor(
        private cartRepository: CartRepository,
        private productRepository: ProductRepository,
    ) {}

    // Локальная корзина имеет приоритет: заменяет DB-корзину целиком.
    // Вызывается после авторизации, если у пользователя была непустая локальная корзина.
    async execute(input: SyncCartInput): Promise<void> {
        await this.cartRepository.clear(input.userId);

        const validItems = input.items.filter(i => i.quantity > 0);
        if (validItems.length === 0) return;

        const products = await this.productRepository.findByIds(validItems.map(i => i.productId));
        const existingIds = new Set(products.map(p => p.id));

        for (const item of validItems) {
            if (!existingIds.has(item.productId)) continue; // товар мог быть удалён пока пользователь не был авторизован
            await this.cartRepository.save({
                userId: input.userId,
                productId: item.productId,
                quantity: item.quantity,
            });
        }
    }
}
