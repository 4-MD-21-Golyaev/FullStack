import { describe, it, expect, vi } from 'vitest';
import { StartPickingUseCase } from '../StartPickingUseCase';
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

describe('StartPickingUseCase', () => {

    it('transitions order from CREATED to PICKING', async () => {
        const order = makeOrder(OrderState.CREATED);

        const orderRepo = {
            save: vi.fn(),
            findById: vi.fn().mockResolvedValue(order),
            findByUserId: vi.fn(),
            findStaleInPayment: vi.fn(),
            findAllWithFilters: vi.fn() as any,
            countWithFilters: vi.fn() as any,
            findAvailableForPicking: vi.fn() as any,
            findByPickerClaimUserId: vi.fn() as any,
            claimForPicker: vi.fn() as any,
            releasePickerClaim: vi.fn() as any,
            findAvailableForDelivery: vi.fn() as any,
            findByCourierClaimUserId: vi.fn() as any,
            claimForCourier: vi.fn() as any,
            releaseCourierClaim: vi.fn() as any,
        };

        const useCase = new StartPickingUseCase(orderRepo as unknown as any);
        const result = await useCase.execute({ orderId: 'order-1' });

        expect(result.state).toBe(OrderState.PICKING);
        expect(orderRepo.save).toHaveBeenCalledWith(result);
    });

    it('throws if order not found', async () => {
        const orderRepo = {
            save: vi.fn(),
            findById: vi.fn().mockResolvedValue(null),
            findByUserId: vi.fn(),
            findStaleInPayment: vi.fn(),
            findAllWithFilters: vi.fn() as any,
            countWithFilters: vi.fn() as any,
            findAvailableForPicking: vi.fn() as any,
            findByPickerClaimUserId: vi.fn() as any,
            claimForPicker: vi.fn() as any,
            releasePickerClaim: vi.fn() as any,
            findAvailableForDelivery: vi.fn() as any,
            findByCourierClaimUserId: vi.fn() as any,
            claimForCourier: vi.fn() as any,
            releaseCourierClaim: vi.fn() as any,
        };

        const useCase = new StartPickingUseCase(orderRepo as unknown as any);

        await expect(useCase.execute({ orderId: 'missing' }))
            .rejects.toThrow('Order not found');
    });

    it('throws on invalid state transition', async () => {
        const order = makeOrder(OrderState.PICKING);

        const orderRepo = {
            save: vi.fn(),
            findById: vi.fn().mockResolvedValue(order),
            findByUserId: vi.fn(),
            findStaleInPayment: vi.fn(),
            findAllWithFilters: vi.fn() as any,
            countWithFilters: vi.fn() as any,
            findAvailableForPicking: vi.fn() as any,
            findByPickerClaimUserId: vi.fn() as any,
            claimForPicker: vi.fn() as any,
            releasePickerClaim: vi.fn() as any,
            findAvailableForDelivery: vi.fn() as any,
            findByCourierClaimUserId: vi.fn() as any,
            claimForCourier: vi.fn() as any,
            releaseCourierClaim: vi.fn() as any,
        };

        const useCase = new StartPickingUseCase(orderRepo as unknown as any);

        await expect(useCase.execute({ orderId: 'order-1' }))
            .rejects.toThrow();
    });
});
