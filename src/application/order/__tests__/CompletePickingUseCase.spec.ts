import { describe, it, expect, vi } from 'vitest';
import { CompletePickingUseCase } from '../CompletePickingUseCase';
import { type TransactionRunner, type TransactionContext } from '@/application/ports/TransactionRunner';
import { OrderState } from '@/domain/order/OrderState';
import { type Order } from '@/domain/order/Order';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

const makeOrder = (
    state: OrderState,
    strategy: AbsenceResolutionStrategy = AbsenceResolutionStrategy.CALL_REPLACE,
    items: Order['items'] = [{ productId: 'p1', name: 'Product', article: 'A1', price: 100, quantity: 2 }],
): Order => ({
    id: 'order-1',
    userId: 'user-1',
    address: 'Test address',
    totalAmount: 200,
    state,
    absenceResolutionStrategy: strategy,
    items,
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

    // ─── Success paths ────────────────────────────────────────────────────────

    it('transitions order from PICKING to PAYMENT and writes outbox event', async () => {
        const order = makeOrder(OrderState.PICKING);
        const { runner, ctx } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);
        const result = await useCase.execute({
            orderId: 'order-1',
            unprocessedProductIds: [],
        });

        expect(result.state).toBe(OrderState.PAYMENT);
        expect(ctx.orderRepository.save).toHaveBeenCalledWith(result);
        expect(ctx.outboxRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'ORDER_PICKED',
                payload: expect.objectContaining({ orderId: 'order-1' }),
            }),
        );
    });

    it('outbox payload includes correct item snapshot and totalAmount', async () => {
        const order = makeOrder(OrderState.PICKING);
        const { runner, ctx } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);
        await useCase.execute({
            orderId: 'order-1',
            unprocessedProductIds: [],
        });

        expect(ctx.outboxRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: expect.objectContaining({
                    orderId: 'order-1',
                    totalAmount: 200,
                    items: [
                        expect.objectContaining({
                            productId: 'p1',
                            article: 'A1',
                            name: 'Product',
                            price: 100,
                            quantity: 2,
                        }),
                    ],
                }),
            }),
        );
    });

    it('completes when absent items exist with CALL_REMOVE strategy (remove does not block)', async () => {
        const order = makeOrder(OrderState.PICKING, AbsenceResolutionStrategy.CALL_REMOVE);
        const { runner, ctx } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);
        const result = await useCase.execute({
            orderId: 'order-1',
            unprocessedProductIds: [],
        });

        expect(result.state).toBe(OrderState.PAYMENT);
        expect(ctx.orderRepository.save).toHaveBeenCalledWith(result);
    });

    it('completes when absent items exist with AUTO_REMOVE strategy (remove does not block)', async () => {
        const order = makeOrder(OrderState.PICKING, AbsenceResolutionStrategy.AUTO_REMOVE);
        const { runner, ctx } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);
        const result = await useCase.execute({
            orderId: 'order-1',
            unprocessedProductIds: [],
        });

        expect(result.state).toBe(OrderState.PAYMENT);
        expect(ctx.outboxRepository.save).toHaveBeenCalled();
    });

    it('CALL_REPLACE strategy — previously blocked by guard 3 — now completes successfully', async () => {
        const order = makeOrder(OrderState.PICKING, AbsenceResolutionStrategy.CALL_REPLACE);
        const { runner, ctx } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);
        const result = await useCase.execute({
            orderId: 'order-1',
            unprocessedProductIds: [],
        });

        expect(result.state).toBe(OrderState.PAYMENT);
        expect(ctx.orderRepository.save).toHaveBeenCalledWith(result);
        expect(ctx.outboxRepository.save).toHaveBeenCalled();
    });

    it('AUTO_REPLACE strategy — previously blocked by guard 3 — now completes successfully', async () => {
        const order = makeOrder(OrderState.PICKING, AbsenceResolutionStrategy.AUTO_REPLACE);
        const { runner, ctx } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);
        const result = await useCase.execute({
            orderId: 'order-1',
            unprocessedProductIds: [],
        });

        expect(result.state).toBe(OrderState.PAYMENT);
        expect(ctx.orderRepository.save).toHaveBeenCalledWith(result);
        expect(ctx.outboxRepository.save).toHaveBeenCalled();
    });

    // ─── Error: order not found ───────────────────────────────────────────────

    it('throws if order not found', async () => {
        const { runner } = makeTxRunner(null);

        const useCase = new CompletePickingUseCase(runner);

        await expect(useCase.execute({
            orderId: 'missing',
            unprocessedProductIds: [],
        })).rejects.toThrow('Order not found');
    });

    // ─── Error: unprocessed items ─────────────────────────────────────────────

    it('throws if unprocessedProductIds is non-empty', async () => {
        const order = makeOrder(OrderState.PICKING);
        const { runner } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);

        await expect(useCase.execute({
            orderId: 'order-1',
            unprocessedProductIds: ['p-unprocessed'],
        })).rejects.toThrow('Cannot complete picking: there are unprocessed items');
    });

    it('throws if multiple unprocessed items are present', async () => {
        const order = makeOrder(OrderState.PICKING);
        const { runner } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);

        await expect(useCase.execute({
            orderId: 'order-1',
            unprocessedProductIds: ['p1', 'p2', 'p3'],
        })).rejects.toThrow('Cannot complete picking: there are unprocessed items');
    });

    // ─── Error: no collected items ────────────────────────────────────────────

    it('throws if order has no collected items (empty items array)', async () => {
        const order = makeOrder(OrderState.PICKING, AbsenceResolutionStrategy.CALL_REPLACE, []);
        const { runner } = makeTxRunner(order);

        await expect(new CompletePickingUseCase(runner).execute({
            orderId: 'order-1',
            unprocessedProductIds: [],
        })).rejects.toThrow('no items were collected');
    });

    // ─── Error: invalid state transition ─────────────────────────────────────

    it('throws on invalid state transition when order is CREATED', async () => {
        const order = makeOrder(OrderState.CREATED);
        const { runner } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);

        await expect(useCase.execute({
            orderId: 'order-1',
            unprocessedProductIds: [],
        })).rejects.toThrow();
    });

    it('throws on invalid state transition when order is already PAYMENT', async () => {
        const order = makeOrder(OrderState.PAYMENT);
        const { runner } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);

        await expect(useCase.execute({
            orderId: 'order-1',
            unprocessedProductIds: [],
        })).rejects.toThrow();
    });

    it('throws on invalid state transition when order is CANCELLED', async () => {
        const order = makeOrder(OrderState.CANCELLED);
        const { runner } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);

        await expect(useCase.execute({
            orderId: 'order-1',
            unprocessedProductIds: [],
        })).rejects.toThrow();
    });

    // ─── Guard ordering: unprocessed checked before empty-items ──────────────

    it('unprocessed guard fires before no-items guard', async () => {
        const order = makeOrder(OrderState.PICKING, AbsenceResolutionStrategy.CALL_REPLACE, []);
        const { runner } = makeTxRunner(order);

        const useCase = new CompletePickingUseCase(runner);

        await expect(useCase.execute({
            orderId: 'order-1',
            unprocessedProductIds: ['p-x'],
        })).rejects.toThrow('Cannot complete picking: there are unprocessed items');
    });
});
