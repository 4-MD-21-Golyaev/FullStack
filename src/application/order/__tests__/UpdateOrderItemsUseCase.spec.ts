import { describe, it, expect, vi } from 'vitest';
import { UpdateOrderItemsUseCase } from '../UpdateOrderItemsUseCase';
import { TransactionRunner, TransactionContext } from '../../ports/TransactionRunner';
import { OrderState } from '@/domain/order/OrderState';
import { Order } from '@/domain/order/Order';
import { Product } from '@/domain/product/Product';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';
import { InvalidOrderStateError } from '@/domain/order/errors';

const makeOrder = (state: OrderState): Order => ({
    id: 'order-1',
    userId: 'user-1',
    address: 'Test address',
    totalAmount: 200,
    state,
    absenceResolutionStrategy: AbsenceResolutionStrategy.AUTO_REMOVE,
    items: [
        { productId: 'p1', name: 'Product 1', article: 'A1', price: 100, quantity: 2 },
        { productId: 'p2', name: 'Product 2', article: 'A2', price: 50,  quantity: 0 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
});

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
    id: 'p3', name: 'Product 3', article: 'A3', price: 200, stock: 5,
    imagePath: null, categoryId: 'c1',
    ...overrides,
});

function makeRunner(order: Order | null, product: Product | null = null) {
    const orderRepo = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(order),
    };
    const productRepo = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(product),
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
    };

    const runner: TransactionRunner = {
        run: vi.fn().mockImplementation((work: (ctx: TransactionContext) => Promise<any>) =>
            work({
                orderRepository: orderRepo,
                paymentRepository: {} as any,
                productRepository: productRepo,
            })
        ),
    };

    return { runner, orderRepo, productRepo };
}

describe('UpdateOrderItemsUseCase', () => {

    it('updates items and recalculates totalAmount', async () => {
        const order = makeOrder(OrderState.PICKING);
        const { runner, orderRepo } = makeRunner(order);

        const useCase = new UpdateOrderItemsUseCase(runner);
        const result = await useCase.execute({
            orderId: 'order-1',
            items: [{ productId: 'p1', quantity: 3 }], // p1 stays, p2 removed
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toMatchObject({ productId: 'p1', quantity: 3 });
        expect(result.totalAmount).toBe(300); // 100 * 3
        expect(orderRepo.save).toHaveBeenCalledWith(result);
    });

    it('preserves original snapshot (name, article, price) for existing products', async () => {
        const order = makeOrder(OrderState.PICKING);
        const { runner, productRepo } = makeRunner(order);

        const useCase = new UpdateOrderItemsUseCase(runner);
        const result = await useCase.execute({
            orderId: 'order-1',
            items: [{ productId: 'p1', quantity: 5 }],
        });

        // Should NOT call productRepo for p1 (already in the order)
        expect(productRepo.findById).not.toHaveBeenCalled();
        expect(result.items[0]).toMatchObject({ name: 'Product 1', article: 'A1', price: 100 });
    });

    it('fetches and snapshots new product when productId is not in existing items', async () => {
        const order = makeOrder(OrderState.PICKING);
        const newProduct = makeProduct({ id: 'p3', name: 'Product 3', price: 200 });
        const { runner, productRepo } = makeRunner(order, newProduct);

        const useCase = new UpdateOrderItemsUseCase(runner);
        const result = await useCase.execute({
            orderId: 'order-1',
            items: [{ productId: 'p3', quantity: 1 }],
        });

        expect(productRepo.findById).toHaveBeenCalledWith('p3');
        expect(result.items[0]).toMatchObject({ productId: 'p3', name: 'Product 3', price: 200, quantity: 1 });
        expect(result.totalAmount).toBe(200);
    });

    it('throws if order not found', async () => {
        const { runner } = makeRunner(null);

        await expect(
            new UpdateOrderItemsUseCase(runner).execute({ orderId: 'missing', items: [{ productId: 'p1', quantity: 1 }] })
        ).rejects.toThrow('Order not found');
    });

    it.each([
        OrderState.CREATED,
        OrderState.PAYMENT,
        OrderState.DELIVERY,
        OrderState.CLOSED,
        OrderState.CANCELLED,
    ])('throws InvalidOrderStateError when order is in %s state', async (state) => {
        const { runner } = makeRunner(makeOrder(state));

        await expect(
            new UpdateOrderItemsUseCase(runner).execute({ orderId: 'order-1', items: [{ productId: 'p1', quantity: 1 }] })
        ).rejects.toThrow(InvalidOrderStateError);
    });

    it('throws if items list is empty', async () => {
        const { runner } = makeRunner(makeOrder(OrderState.PICKING));

        await expect(
            new UpdateOrderItemsUseCase(runner).execute({ orderId: 'order-1', items: [] })
        ).rejects.toThrow('at least one item');
    });

    it('throws if quantity is zero or negative', async () => {
        const { runner } = makeRunner(makeOrder(OrderState.PICKING));

        await expect(
            new UpdateOrderItemsUseCase(runner).execute({ orderId: 'order-1', items: [{ productId: 'p1', quantity: 0 }] })
        ).rejects.toThrow('quantity must be positive');
    });

    it('throws if new product is not found in the repository', async () => {
        const { runner } = makeRunner(makeOrder(OrderState.PICKING), null /* product not found */);

        await expect(
            new UpdateOrderItemsUseCase(runner).execute({ orderId: 'order-1', items: [{ productId: 'p-unknown', quantity: 1 }] })
        ).rejects.toThrow('not found');
    });

});
