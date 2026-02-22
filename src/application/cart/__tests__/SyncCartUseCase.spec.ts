import { describe, it, expect, vi } from 'vitest';
import { SyncCartUseCase } from '../SyncCartUseCase';
import { CartRepository } from '@/application/ports/CartRepository';
import { ProductRepository } from '@/application/ports/ProductRepository';

const mockProduct = (id: string) => ({
    id, name: `Product ${id}`, article: id, price: 100, stock: 10, imagePath: null, categoryId: 'c1',
});

function makeCartRepo(): CartRepository {
    return {
        findByUserId: vi.fn(),
        findByUserAndProduct: vi.fn(),
        save: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
    };
}

function makeProductRepo(products: Record<string, any>): ProductRepository {
    return {
        findById: vi.fn(),
        findByIds: vi.fn().mockImplementation((ids: string[]) =>
            Promise.resolve(ids.map(id => products[id]).filter(Boolean))
        ),
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
        save: vi.fn(),
    };
}

describe('SyncCartUseCase', () => {
    it('clears DB cart and saves local items', async () => {
        const cartRepo = makeCartRepo();
        const useCase = new SyncCartUseCase(cartRepo, makeProductRepo({ p1: mockProduct('p1'), p2: mockProduct('p2') }));

        await useCase.execute({ userId: 'u1', items: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }] });

        expect(cartRepo.clear).toHaveBeenCalledWith('u1');
        expect(cartRepo.save).toHaveBeenCalledTimes(2);
        expect(cartRepo.save).toHaveBeenCalledWith({ userId: 'u1', productId: 'p1', quantity: 2 });
        expect(cartRepo.save).toHaveBeenCalledWith({ userId: 'u1', productId: 'p2', quantity: 1 });
    });

    it('clears DB cart even when local cart is empty', async () => {
        const cartRepo = makeCartRepo();
        const useCase = new SyncCartUseCase(cartRepo, makeProductRepo({}));

        await useCase.execute({ userId: 'u1', items: [] });

        expect(cartRepo.clear).toHaveBeenCalledWith('u1');
        expect(cartRepo.save).not.toHaveBeenCalled();
    });

    it('skips items whose product no longer exists', async () => {
        const cartRepo = makeCartRepo();
        const useCase = new SyncCartUseCase(cartRepo, makeProductRepo({ p1: mockProduct('p1') }));

        await useCase.execute({ userId: 'u1', items: [{ productId: 'p1', quantity: 1 }, { productId: 'deleted', quantity: 2 }] });

        expect(cartRepo.save).toHaveBeenCalledTimes(1);
        expect(cartRepo.save).toHaveBeenCalledWith({ userId: 'u1', productId: 'p1', quantity: 1 });
    });

    it('skips items with non-positive quantity', async () => {
        const cartRepo = makeCartRepo();
        const useCase = new SyncCartUseCase(cartRepo, makeProductRepo({ p1: mockProduct('p1') }));

        await useCase.execute({ userId: 'u1', items: [{ productId: 'p1', quantity: 0 }] });

        expect(cartRepo.save).not.toHaveBeenCalled();
    });
});
