import { describe, it, expect, vi } from 'vitest';
import { RemoveFromCartUseCase } from '../RemoveFromCartUseCase';
import { CartRepository } from '@/application/ports/CartRepository';

function makeCartRepo(): CartRepository {
    return {
        findByUserId: vi.fn(),
        findByUserAndProduct: vi.fn(),
        save: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
    };
}

describe('RemoveFromCartUseCase', () => {
    it('removes item from cart', async () => {
        const cartRepo = makeCartRepo();
        const useCase = new RemoveFromCartUseCase(cartRepo);

        await useCase.execute({ userId: 'u1', productId: 'p1' });

        expect(cartRepo.remove).toHaveBeenCalledWith('u1', 'p1');
    });
});
