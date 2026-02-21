import { describe, it, expect, vi } from 'vitest';
import { UpdateCartItemUseCase } from '../UpdateCartItemUseCase';
import { CartRepository } from '@/application/ports/CartRepository';
import { ProductRepository } from '@/application/ports/ProductRepository';

const mockProduct = {
    id: 'p1',
    name: 'Product 1',
    article: 'A1',
    price: 100,
    stock: 10,
    imagePath: null,
    categoryId: 'c1',
};

function makeCartRepo(existing: any = { userId: 'u1', productId: 'p1', quantity: 3 }): CartRepository {
    return {
        findByUserId: vi.fn(),
        findByUserAndProduct: vi.fn().mockResolvedValue(existing),
        save: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
    };
}

function makeProductRepo(product: any = mockProduct): ProductRepository {
    return {
        findById: vi.fn().mockResolvedValue(product),
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
        save: vi.fn(),
    };
}

describe('UpdateCartItemUseCase', () => {
    it('updates quantity of existing cart item', async () => {
        const cartRepo = makeCartRepo();
        const useCase = new UpdateCartItemUseCase(cartRepo, makeProductRepo());

        await useCase.execute({ userId: 'u1', productId: 'p1', quantity: 5 });

        expect(cartRepo.save).toHaveBeenCalledWith({ userId: 'u1', productId: 'p1', quantity: 5 });
    });

    it('throws when item not in cart', async () => {
        const cartRepo = makeCartRepo(null);
        const useCase = new UpdateCartItemUseCase(cartRepo, makeProductRepo());

        await expect(
            useCase.execute({ userId: 'u1', productId: 'p1', quantity: 2 })
        ).rejects.toThrow('Cart item not found');
    });

    it('throws when product not found', async () => {
        const cartRepo = makeCartRepo();
        const useCase = new UpdateCartItemUseCase(cartRepo, makeProductRepo(null));

        await expect(
            useCase.execute({ userId: 'u1', productId: 'p1', quantity: 2 })
        ).rejects.toThrow('Product p1 not found');
    });

    it('throws when quantity is zero', async () => {
        const useCase = new UpdateCartItemUseCase(makeCartRepo(), makeProductRepo());

        await expect(
            useCase.execute({ userId: 'u1', productId: 'p1', quantity: 0 })
        ).rejects.toThrow('Quantity must be positive');
    });

    it('throws when quantity is negative', async () => {
        const useCase = new UpdateCartItemUseCase(makeCartRepo(), makeProductRepo());

        await expect(
            useCase.execute({ userId: 'u1', productId: 'p1', quantity: -3 })
        ).rejects.toThrow('Quantity must be positive');
    });
});
