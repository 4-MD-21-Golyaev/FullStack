import { describe, it, expect, vi } from 'vitest';
import { CompletePickingUseCase } from '../CompletePickingUseCase';
import { TransactionRunner, TransactionContext } from '@/application/ports/TransactionRunner';
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

function makeTxRunner(order: Order | null): { runner: TransactionRunner; ctx: TransactionContext } {
    const ctx: TransactionContext = {
        orderRepository: {
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
        },
        paymentRepository: {} as any,
        productRepository: {} as any,
        outboxRepository: {
            save: vi.fn(),
            claimPending: vi.fn(),
            markProcessed: vi.fn(),
            markFailed: vi.fn(),
            incrementRetry: vi.fn(),
        },
        auditLogRepository: {} as any,
    };

    const runner: TransactionRunner = {
        run: vi.fn().mockImplementation((work) => work(ctx)),
    };

    return { runner, ctx };
}

describe('CompletePickingUseCase', () => {

    it('transitions order from PICKING to PAYMENT and writes outbox event', async () => {
        const order = makeOrder(OrderState.PICKING);
        const { runner, ctx } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);
        const result = await useCase.execute({ orderId: 'order-1' });

        expect(result.state).toBe(OrderState.PAYMENT);
        expect(ctx.orderRepository.save).toHaveBeenCalledWith(result);
        expect(ctx.outboxRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'ORDER_PICKED',
                payload: expect.objectContaining({ orderId: 'order-1' }),
            }),
        );
    });

    it('throws if order not found', async () => {
        const { runner } = makeTxRunner(null);

        const useCase = new CompletePickingUseCase(runner);

        await expect(useCase.execute({ orderId: 'missing' }))
            .rejects.toThrow('Order not found');
    });

    it('throws on invalid state transition', async () => {
        const order = makeOrder(OrderState.CREATED);
        const { runner } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);

        await expect(useCase.execute({ orderId: 'order-1' }))
            .rejects.toThrow();
    });
});
