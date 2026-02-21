import { CartRepository } from '@/application/ports/CartRepository';

export interface RemoveFromCartInput {
    userId: string;
    productId: string;
}

export class RemoveFromCartUseCase {
    constructor(private cartRepository: CartRepository) {}

    async execute(input: RemoveFromCartInput): Promise<void> {
        await this.cartRepository.remove(input.userId, input.productId);
    }
}
