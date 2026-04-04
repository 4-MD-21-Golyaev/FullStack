import { describe, it, expect, vi } from 'vitest';
import { GetFavoritesUseCase } from '../GetFavoritesUseCase';
import { type FavoriteRepository } from '@/application/ports/FavoriteRepository';
import { type ProductRepository } from '@/application/ports/ProductRepository';

const product1 = {
    id: 'p1',
    name: 'Product 1',
    article: 'A1',
    price: 100,
    stock: 10,
    imagePath: null,
    categoryId: 'c1',
};

const product2 = {
    id: 'p2',
    name: 'Product 2',
    article: 'A2',
    price: 200,
    stock: 5,
    imagePath: '/img.png',
    categoryId: 'c2',
};

function makeFavoriteRepo(favorites: any[] = []): FavoriteRepository {
    return {
        findByUserId: vi.fn().mockResolvedValue(favorites),
        findByUserAndProduct: vi.fn(),
        save: vi.fn(),
        remove: vi.fn(),
    };
}

function makeProductRepo(products: any[] = [product1, product2]): ProductRepository {
    return {
        findById: vi.fn(),
        findByIds: vi.fn().mockResolvedValue(products),
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
        findByCategoryIds: vi.fn(),
        findByArticle: vi.fn(),
        findBySearch: vi.fn(),
        save: vi.fn(),
    };
}

describe('GetFavoritesUseCase', () => {
    it('returns empty array when no favorites', async () => {
        const favoriteRepo = makeFavoriteRepo([]);
        const productRepo = makeProductRepo([]);
        const useCase = new GetFavoritesUseCase(favoriteRepo, productRepo);

        const res = await useCase.execute('u1');

        expect(res).toEqual([]);
        expect(productRepo.findByIds).not.toHaveBeenCalled();
    });

    it('returns favorites mapped to product views in favorite order', async () => {
        const favorites = [
            { userId: 'u1', productId: 'p2', createdAt: new Date() },
            { userId: 'u1', productId: 'p1', createdAt: new Date() },
        ];
        const favoriteRepo = makeFavoriteRepo(favorites);
        const productRepo = makeProductRepo([product1, product2]);
        const useCase = new GetFavoritesUseCase(favoriteRepo, productRepo);

        const res = await useCase.execute('u1');

        expect(res.map(r => r.id)).toEqual(['p2', 'p1']);
        expect(res[0]).toMatchObject({
            id: 'p2',
            name: 'Product 2',
            price: 200,
            imagePath: '/img.png',
            stock: 5,
            categoryId: 'c2',
        });
    });

    it('skips favorites where product no longer exists', async () => {
        const favorites = [
            { userId: 'u1', productId: 'p1', createdAt: new Date() },
            { userId: 'u1', productId: 'p2', createdAt: new Date() },
        ];
        const favoriteRepo = makeFavoriteRepo(favorites);
        const productRepo = makeProductRepo([product1]);
        const useCase = new GetFavoritesUseCase(favoriteRepo, productRepo);

        const res = await useCase.execute('u1');

        expect(res).toHaveLength(1);
        expect(res[0].id).toBe('p1');
    });
});
