import { describe, it, expect, vi } from 'vitest';
import { CompletePickingUseCase } from '../CompletePickingUseCase';
import { OrderRepository } from '../../ports/OrderRepository';
import { OrderState } from '@/domain/order/OrderState';
import { Order } from '@/domain/order/Order';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

const makeOrder = (state: OrderState): Order => ({
    id: 'order-1',
    userId: 'user-1',
    address: 'Test address',
    totalAmount: 200,
    state,
    absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
    items: [{ productId: 'p1', name: 'Product', article: 'A1', price: 100, quantity: 2 }],
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe('CompletePickingUseCase', () => {

    it('transitions order from PICKING to PAYMENT', async () => {
        const order = makeOrder(OrderState.PICKING);

        const orderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn().mockResolvedValue(order),
        };

        const useCase = new CompletePickingUseCase(orderRepo);
        const result = await useCase.execute({ orderId: 'order-1' });

        expect(result.state).toBe(OrderState.PAYMENT);
        expect(orderRepo.save).toHaveBeenCalledWith(result);
    });

    it('throws if order not found', async () => {
        const orderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn().mockResolvedValue(null),
        };

        const useCase = new CompletePickingUseCase(orderRepo);

        await expect(useCase.execute({ orderId: 'missing' }))
            .rejects.toThrow('Order not found');
    });

    it('throws on invalid state transition', async () => {
        const order = makeOrder(OrderState.CREATED);

        const orderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn().mockResolvedValue(order),
        };

        const useCase = new CompletePickingUseCase(orderRepo);

        await expect(useCase.execute({ orderId: 'order-1' }))
            .rejects.toThrow();
    });
});
