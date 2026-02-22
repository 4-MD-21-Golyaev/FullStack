import { describe, it, expect, vi } from 'vitest';
import { RepeatOrderToCartUseCase } from '../RepeatOrderToCartUseCase';
import { OrderState } from '@/domain/order/OrderState';
import { Order } from '@/domain/order/Order';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

const makeOrder = (): Order => ({
    id: 'order-1',
    userId: 'user-1',
    address: 'Test address',
    totalAmount: 300,
    state: OrderState.CLOSED,
    absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
    items: [
        { productId: 'p1', name: 'Product 1', article: 'A1', price: 100, quantity: 2 },
        { productId: 'p2', name: 'Product 2', article: 'A2', price: 50,  quantity: 1 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
});

function makeRepos(order: Order | null, existingCartItems: { productId: string; quantity: number }[] = []) {
    const orderRepo = {
        findById: vi.fn().mockResolvedValue(order),
        findByUserId: vi.fn(),
        save: vi.fn(),
    };

    const cartRepo = {
        findByUserId: vi.fn().mockResolvedValue(
            existingCartItems.map(i => ({ userId: 'user-1', ...i }))
        ),
        findByUserAndProduct: vi.fn(),
        save: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
    };

    return { orderRepo, cartRepo };
}

describe('RepeatOrderToCartUseCase', () => {

    it('adds all order items to an empty cart', async () => {
        const { orderRepo, cartRepo } = makeRepos(makeOrder(), []);

        const result = await new RepeatOrderToCartUseCase(orderRepo, cartRepo).execute({
            orderId: 'order-1',
            userId: 'user-1',
        });

        expect(result.addedCount).toBe(2);
        expect(cartRepo.save).toHaveBeenCalledTimes(2);
        expect(cartRepo.save).toHaveBeenCalledWith({ userId: 'user-1', productId: 'p1', quantity: 2 });
        expect(cartRepo.save).toHaveBeenCalledWith({ userId: 'user-1', productId: 'p2', quantity: 1 });
    });

    it('merges quantities when items already exist in cart', async () => {
        // p1 already has quantity 3 in cart; order has quantity 2 → should become 5
        const { orderRepo, cartRepo } = makeRepos(makeOrder(), [
            { productId: 'p1', quantity: 3 },
        ]);

        await new RepeatOrderToCartUseCase(orderRepo, cartRepo).execute({
            orderId: 'order-1',
            userId: 'user-1',
        });

        expect(cartRepo.save).toHaveBeenCalledWith({ userId: 'user-1', productId: 'p1', quantity: 5 });
        expect(cartRepo.save).toHaveBeenCalledWith({ userId: 'user-1', productId: 'p2', quantity: 1 });
    });

    it('adds items regardless of stock availability (no product lookup)', async () => {
        const { orderRepo, cartRepo } = makeRepos(makeOrder(), []);

        // Should succeed — no productRepository is involved
        const result = await new RepeatOrderToCartUseCase(orderRepo, cartRepo).execute({
            orderId: 'order-1',
            userId: 'user-1',
        });

        expect(result.addedCount).toBe(2);
    });

    it('throws if order not found', async () => {
        const { orderRepo, cartRepo } = makeRepos(null);

        await expect(
            new RepeatOrderToCartUseCase(orderRepo, cartRepo).execute({ orderId: 'missing', userId: 'user-1' })
        ).rejects.toThrow('Order not found');

        expect(cartRepo.save).not.toHaveBeenCalled();
    });

    it('throws Forbidden if order belongs to another user', async () => {
        const { orderRepo, cartRepo } = makeRepos(makeOrder());

        await expect(
            new RepeatOrderToCartUseCase(orderRepo, cartRepo).execute({ orderId: 'order-1', userId: 'other-user' })
        ).rejects.toThrow('Forbidden');

        expect(cartRepo.save).not.toHaveBeenCalled();
    });

});
