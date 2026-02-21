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

        for (const item of input.items) {
            if (item.quantity <= 0) continue;
            const product = await this.productRepository.findById(item.productId);
            if (!product) continue; // товар мог быть удалён пока пользователь не был авторизован
            await this.cartRepository.save({
                userId: input.userId,
                productId: item.productId,
                quantity: item.quantity,
            });
        }
    }
}
