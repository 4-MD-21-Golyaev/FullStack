import { describe, it, expect, vi } from 'vitest';
import { AddToCartUseCase } from '../AddToCartUseCase';
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

function makeCartRepo(existing: any = null): CartRepository {
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

describe('AddToCartUseCase', () => {
    it('adds new item when not in cart', async () => {
        const cartRepo = makeCartRepo(null);
        const useCase = new AddToCartUseCase(cartRepo, makeProductRepo());

        await useCase.execute({ userId: 'u1', productId: 'p1', quantity: 2 });

        expect(cartRepo.save).toHaveBeenCalledWith({ userId: 'u1', productId: 'p1', quantity: 2 });
    });

    it('increments quantity when item already in cart', async () => {
        const cartRepo = makeCartRepo({ userId: 'u1', productId: 'p1', quantity: 3 });
        const useCase = new AddToCartUseCase(cartRepo, makeProductRepo());

        await useCase.execute({ userId: 'u1', productId: 'p1', quantity: 2 });

        expect(cartRepo.save).toHaveBeenCalledWith({ userId: 'u1', productId: 'p1', quantity: 5 });
    });

    it('throws when product not found', async () => {
        const cartRepo = makeCartRepo(null);
        const productRepo = makeProductRepo(null);
        const useCase = new AddToCartUseCase(cartRepo, productRepo);

        await expect(
            useCase.execute({ userId: 'u1', productId: 'p1', quantity: 1 })
        ).rejects.toThrow('Product p1 not found');
    });

    it('throws when quantity is zero', async () => {
        const useCase = new AddToCartUseCase(makeCartRepo(), makeProductRepo());

        await expect(
            useCase.execute({ userId: 'u1', productId: 'p1', quantity: 0 })
        ).rejects.toThrow('Quantity must be positive');
    });

    it('throws when quantity is negative', async () => {
        const useCase = new AddToCartUseCase(makeCartRepo(), makeProductRepo());

        await expect(
            useCase.execute({ userId: 'u1', productId: 'p1', quantity: -1 })
        ).rejects.toThrow('Quantity must be positive');
    });
});
