import { describe, it, expect, vi } from 'vitest';
import { OrderPaymentTimeoutUseCase } from '../OrderPaymentTimeoutUseCase';
import { OrderRepository } from '../../ports/OrderRepository';
import { TransactionRunner, TransactionContext } from '../../ports/TransactionRunner';
import { OrderState } from '@/domain/order/OrderState';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Order } from '@/domain/order/Order';
import { Payment } from '@/domain/payment/Payment';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

const makeOrder = (state: OrderState, overrides: Partial<Order> = {}): Order => ({
    id: 'order-1',
    userId: 'user-1',
    address: 'Test address',
    totalAmount: 500,
    state,
    absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
    items: [{ productId: 'p1', name: 'Product', article: 'A1', price: 500, quantity: 1 }],
    createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
    updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    ...overrides,
});

const makePayment = (status: PaymentStatus, overrides: Partial<Payment> = {}): Payment => ({
    id: 'pay-1',
    orderId: 'order-1',
    amount: 500,
    status,
    externalId: 'yk-ext-id',
    createdAt: new Date(Date.now() - 20 * 60 * 1000),
    ...overrides,
});

function makeDeps(
    staleOrders: Order[],
    freshOrder: Order | null,
    pendingPayment: Payment | null,
) {
    const orderRepo: OrderRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(freshOrder),
        findByUserId: vi.fn(),
        findStaleInPayment: vi.fn().mockResolvedValue(staleOrders),
    };

    const txOrderRepo = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(freshOrder),
        findByUserId: vi.fn(),
        findStaleInPayment: vi.fn(),
    };
    const txPaymentRepo = {
        save: vi.fn(),
        findById: vi.fn(),
        findByOrderId: vi.fn(),
        findPendingByOrderId: vi.fn().mockResolvedValue(pendingPayment),
        findByExternalId: vi.fn(),
        findStalePending: vi.fn(),
    };

    const transactionRunner: TransactionRunner = {
        run: vi.fn().mockImplementation((work: (ctx: TransactionContext) => Promise<any>) =>
            work({
                orderRepository: txOrderRepo,
                paymentRepository: txPaymentRepo,
                productRepository: {} as any,
                outboxRepository: {} as any,
            })
        ),
    };

    return { orderRepo, transactionRunner, txOrderRepo, txPaymentRepo };
}

describe('OrderPaymentTimeoutUseCase', () => {

    it('cancels order when no PENDING payment exists', async () => {
        const staleOrder = makeOrder(OrderState.PAYMENT);
        const { orderRepo, transactionRunner, txOrderRepo, txPaymentRepo } =
            makeDeps([staleOrder], staleOrder, null);

        const useCase = new OrderPaymentTimeoutUseCase(orderRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.cancelled).toBe(1);
        expect(result.errors).toBe(0);
        expect(txPaymentRepo.save).not.toHaveBeenCalled();
        expect(txOrderRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ state: OrderState.CANCELLED })
        );
    });

    it('skips cancellation when there is an active PENDING payment (user may still complete it)', async () => {
        const staleOrder = makeOrder(OrderState.PAYMENT);
        // User initiated payment 2 minutes ago — still in progress
        const freshPending = makePayment(PaymentStatus.PENDING, {
            createdAt: new Date(Date.now() - 2 * 60 * 1000),
        });
        const { orderRepo, transactionRunner, txOrderRepo, txPaymentRepo } =
            makeDeps([staleOrder], staleOrder, freshPending);

        const useCase = new OrderPaymentTimeoutUseCase(orderRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.cancelled).toBe(0);
        expect(result.errors).toBe(0);
        // Neither payment nor order must be touched
        expect(txPaymentRepo.save).not.toHaveBeenCalled();
        expect(txOrderRepo.save).not.toHaveBeenCalled();
    });

    it('race condition: skips order that already left PAYMENT state inside transaction', async () => {
        const staleOrder = makeOrder(OrderState.PAYMENT);
        // Inside tx, order was already moved to DELIVERY (payment succeeded)
        const freshOrder = makeOrder(OrderState.DELIVERY);
        const { orderRepo, transactionRunner, txOrderRepo, txPaymentRepo } =
            makeDeps([staleOrder], freshOrder, null);

        const useCase = new OrderPaymentTimeoutUseCase(orderRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.cancelled).toBe(0);
        expect(result.errors).toBe(0);
        expect(txOrderRepo.save).not.toHaveBeenCalled();
        expect(txPaymentRepo.save).not.toHaveBeenCalled();
    });

    it('returns zero cancelled when there are no stale orders', async () => {
        const { orderRepo, transactionRunner } = makeDeps([], null, null);

        const useCase = new OrderPaymentTimeoutUseCase(orderRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.cancelled).toBe(0);
        expect(result.errors).toBe(0);
        expect(transactionRunner.run).not.toHaveBeenCalled();
    });

    it('counts errors and continues processing remaining orders', async () => {
        const order1 = makeOrder(OrderState.PAYMENT, { id: 'order-1' });
        const order2 = makeOrder(OrderState.PAYMENT, { id: 'order-2' });

        const orderRepo: OrderRepository = {
            save: vi.fn(),
            findById: vi.fn(),
            findByUserId: vi.fn(),
            findStaleInPayment: vi.fn().mockResolvedValue([order1, order2]),
        };

        let callCount = 0;
        const transactionRunner: TransactionRunner = {
            run: vi.fn().mockImplementation(async (work: (ctx: TransactionContext) => Promise<any>) => {
                callCount++;
                if (callCount === 1) throw new Error('DB error');
                return work({
                    orderRepository: {
                        save: vi.fn(),
                        findById: vi.fn().mockResolvedValue(order2),
                        findByUserId: vi.fn(),
                        findStaleInPayment: vi.fn(),
                    },
                    paymentRepository: {
                        save: vi.fn(),
                        findById: vi.fn(),
                        findByOrderId: vi.fn(),
                        findPendingByOrderId: vi.fn().mockResolvedValue(null), // no active payment
                        findByExternalId: vi.fn(),
                        findStalePending: vi.fn(),
                    },
                    productRepository: {} as any,
                    outboxRepository: {} as any,
                });
            }),
        };

        const useCase = new OrderPaymentTimeoutUseCase(orderRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.errors).toBe(1);
        expect(result.cancelled).toBe(1);
    });

});
