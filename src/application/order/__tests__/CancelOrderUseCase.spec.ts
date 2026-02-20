import { describe, it, expect, vi } from 'vitest';
import { CancelOrderUseCase } from '../CancelOrderUseCase';
import { TransactionRunner, TransactionContext } from '../../ports/TransactionRunner';
import { OrderState } from '@/domain/order/OrderState';
import { Order } from '@/domain/order/Order';

const makeOrder = (state: OrderState): Order => ({
    id: 'order-1',
    userId: 'user-1',
    address: 'Test address',
    totalAmount: 200,
    state,
    items: [{ productId: 'p1', name: 'Product', article: 'A1', price: 100, quantity: 2 }],
    createdAt: new Date(),
    updatedAt: new Date(),
});

function makeTransactionRunner(order: Order | null): TransactionRunner {
    const orderRepo = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(order),
        findByIdWithLock: vi.fn().mockResolvedValue(order),
    };

    return {
        run: vi.fn().mockImplementation((work: (ctx: TransactionContext) => Promise<any>) =>
            work({
                orderRepository: orderRepo,
                paymentRepository: {} as any,
                productRepository: {} as any,
            })
        ),
        _orderRepo: orderRepo,
    } as any;
}

describe('CancelOrderUseCase', () => {

    it.each([
        OrderState.CREATED,
        OrderState.PICKING,
        OrderState.PAYMENT,
    ])('cancels order from %s state', async (state) => {
        const order = makeOrder(state);
        const runner = makeTransactionRunner(order);

        const useCase = new CancelOrderUseCase(runner);
        const result = await useCase.execute({ orderId: 'order-1' });

        expect(result.state).toBe(OrderState.CANCELLED);
        expect((runner as any)._orderRepo.save).toHaveBeenCalledWith(result);
    });

    it('throws if order not found', async () => {
        const runner = makeTransactionRunner(null);

        const useCase = new CancelOrderUseCase(runner);

        await expect(useCase.execute({ orderId: 'missing' }))
            .rejects.toThrow('Order not found');
    });

    it.each([
        OrderState.DELIVERY,
        OrderState.CLOSED,
        OrderState.CANCELLED,
    ])('throws when cancelling from terminal/locked state %s', async (state) => {
        const order = makeOrder(state);
        const runner = makeTransactionRunner(order);

        const useCase = new CancelOrderUseCase(runner);

        await expect(useCase.execute({ orderId: 'order-1' }))
            .rejects.toThrow();
    });
});
