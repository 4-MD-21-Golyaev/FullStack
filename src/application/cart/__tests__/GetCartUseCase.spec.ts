import { describe, it, expect, vi } from 'vitest';
import { GetCartUseCase } from '../GetCartUseCase';
import { CartRepository } from '@/application/ports/CartRepository';
import { ProductRepository } from '@/application/ports/ProductRepository';

const mockProduct = {
    id: 'p1',
    name: 'Widget',
    article: 'W-001',
    price: 150,
    stock: 5,
    imagePath: '/img/widget.png',
    categoryId: 'c1',
};

function makeCartRepo(items: any[] = []): CartRepository {
    return {
        findByUserId: vi.fn().mockResolvedValue(items),
        findByUserAndProduct: vi.fn(),
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

describe('GetCartUseCase', () => {
    it('returns empty array for user with no cart items', async () => {
        const useCase = new GetCartUseCase(makeCartRepo([]), makeProductRepo());
        const result = await useCase.execute('u1');
        expect(result).toEqual([]);
    });

    it('returns enriched cart items with product data', async () => {
        const cartItems = [{ userId: 'u1', productId: 'p1', quantity: 3 }];
        const useCase = new GetCartUseCase(makeCartRepo(cartItems), makeProductRepo());
        const result = await useCase.execute('u1');

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            productId: 'p1',
            name: 'Widget',
            article: 'W-001',
            price: 150,
            imagePath: '/img/widget.png',
            quantity: 3,
        });
    });

    it('skips items whose product no longer exists', async () => {
        const cartItems = [
            { userId: 'u1', productId: 'p1', quantity: 2 },
            { userId: 'u1', productId: 'p2', quantity: 1 },
        ];
        const productRepo: ProductRepository = {
            findById: vi.fn().mockImplementation((id: string) =>
                id === 'p1' ? Promise.resolve(mockProduct) : Promise.resolve(null)
            ),
            findAll: vi.fn(),
            findByCategoryId: vi.fn(),
            save: vi.fn(),
        };
        const useCase = new GetCartUseCase(makeCartRepo(cartItems), productRepo);
        const result = await useCase.execute('u1');

        expect(result).toHaveLength(1);
        expect(result[0].productId).toBe('p1');
    });
});
