import { describe, it, expect, vi } from 'vitest';
import { AddToFavoritesUseCase } from '../AddToFavoritesUseCase';
import { type FavoriteRepository } from '@/application/ports/FavoriteRepository';
import { type ProductRepository } from '@/application/ports/ProductRepository';

const mockProduct = {
    id: 'p1',
    name: 'Product 1',
    article: 'A1',
    price: 100,
    stock: 10,
    imagePath: null,
    categoryId: 'c1',
};

function makeFavoriteRepo(existing: any = null): FavoriteRepository {
    return {
        findByUserId: vi.fn(),
        findByUserAndProduct: vi.fn().mockResolvedValue(existing),
        save: vi.fn(),
        remove: vi.fn(),
    };
}

function makeProductRepo(product: any = mockProduct): ProductRepository {
    return {
        findById: vi.fn().mockResolvedValue(product),
        findByIds: vi.fn(),
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
        findByCategoryIds: vi.fn(),
        findByArticle: vi.fn(),
        findBySearch: vi.fn(),
        save: vi.fn(),
    };
}

describe('AddToFavoritesUseCase', () => {
    it('adds favorite when not already present', async () => {
        const favoriteRepo = makeFavoriteRepo(null);
        const useCase = new AddToFavoritesUseCase(favoriteRepo, makeProductRepo());

        await useCase.execute({ userId: 'u1', productId: 'p1' });

        expect(favoriteRepo.save).toHaveBeenCalledWith({
            userId: 'u1',
            productId: 'p1',
            createdAt: expect.any(Date),
        });
    });

    it('is idempotent when favorite already exists', async () => {
        const favoriteRepo = makeFavoriteRepo({ userId: 'u1', productId: 'p1', createdAt: new Date() });
        const useCase = new AddToFavoritesUseCase(favoriteRepo, makeProductRepo());

        await useCase.execute({ userId: 'u1', productId: 'p1' });

        expect(favoriteRepo.save).not.toHaveBeenCalled();
    });

    it('throws when productId is missing', async () => {
        const useCase = new AddToFavoritesUseCase(makeFavoriteRepo(), makeProductRepo());

        await expect(
            useCase.execute({ userId: 'u1', productId: '' })
        ).rejects.toThrow('Product id is required');
    });

    it('throws when product does not exist', async () => {
        const favoriteRepo = makeFavoriteRepo(null);
        const productRepo = makeProductRepo(null);
        const useCase = new AddToFavoritesUseCase(favoriteRepo, productRepo);

        await expect(
            useCase.execute({ userId: 'u1', productId: 'p1' })
        ).rejects.toThrow('Product p1 not found');
    });
});
