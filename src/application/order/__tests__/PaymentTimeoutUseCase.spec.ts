import { describe, it, expect, vi } from 'vitest';
import { PaymentTimeoutUseCase } from '../PaymentTimeoutUseCase';
import { PaymentRepository } from '../../ports/PaymentRepository';
import { TransactionRunner, TransactionContext } from '../../ports/TransactionRunner';
import { OrderState } from '@/domain/order/OrderState';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Order } from '@/domain/order/Order';
import { Payment } from '@/domain/payment/Payment';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

const makeOrder = (state: OrderState): Order => ({
    id: 'order-1',
    userId: 'user-1',
    address: 'Test address',
    totalAmount: 500,
    state,
    absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
    items: [{ productId: 'p1', name: 'Product', article: 'A1', price: 500, quantity: 1 }],
    createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    updatedAt: new Date(Date.now() - 15 * 60 * 1000),
});

const makePayment = (status: PaymentStatus, overrides: Partial<Payment> = {}): Payment => ({
    id: 'pay-1',
    orderId: 'order-1',
    amount: 500,
    status,
    externalId: 'yk-ext-id',
    createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    ...overrides,
});

function makeDeps(stalePayments: Payment[], order: Order | null, freshPayment: Payment | null) {
    const paymentRepo: PaymentRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(freshPayment),
        findByOrderId: vi.fn(),
        findPendingByOrderId: vi.fn(),
        findByExternalId: vi.fn(),
        findStalePending: vi.fn().mockResolvedValue(stalePayments),
    };

    const txOrderRepo = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(order),
    };
    const txPaymentRepo = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(freshPayment),
        findByOrderId: vi.fn(),
        findPendingByOrderId: vi.fn(),
        findByExternalId: vi.fn(),
        findStalePending: vi.fn().mockResolvedValue([]),
    };

    const transactionRunner: TransactionRunner = {
        run: vi.fn().mockImplementation((work: (ctx: TransactionContext) => Promise<any>) =>
            work({
                orderRepository: txOrderRepo,
                paymentRepository: txPaymentRepo,
                productRepository: {} as any,
            })
        ),
    };

    return { paymentRepo, transactionRunner, txOrderRepo, txPaymentRepo };
}

describe('PaymentTimeoutUseCase', () => {

    it('cancels order and marks payment FAILED when stale PENDING payment found', async () => {
        const stale = makePayment(PaymentStatus.PENDING);
        const order = makeOrder(OrderState.PAYMENT);
        const { paymentRepo, transactionRunner, txOrderRepo, txPaymentRepo } =
            makeDeps([stale], order, stale);

        const useCase = new PaymentTimeoutUseCase(paymentRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.cancelled).toBe(1);
        expect(result.errors).toBe(0);

        expect(txPaymentRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ status: PaymentStatus.FAILED })
        );
        expect(txOrderRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ state: OrderState.CANCELLED })
        );
    });

    it('skips payment that was already processed inside transaction (race condition)', async () => {
        const stale = makePayment(PaymentStatus.PENDING);
        // Inside tx, payment is already SUCCESS (processed by webhook concurrently)
        const freshSuccess = makePayment(PaymentStatus.SUCCESS);
        const order = makeOrder(OrderState.DELIVERY);
        const { paymentRepo, transactionRunner, txOrderRepo, txPaymentRepo } =
            makeDeps([stale], order, freshSuccess);

        const useCase = new PaymentTimeoutUseCase(paymentRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.cancelled).toBe(0);
        expect(result.errors).toBe(0);
        expect(txPaymentRepo.save).not.toHaveBeenCalled();
        expect(txOrderRepo.save).not.toHaveBeenCalled();
    });

    it('skips order that already left PAYMENT state inside transaction', async () => {
        const stale = makePayment(PaymentStatus.PENDING);
        // Inside tx, order has already been moved to DELIVERY
        const order = makeOrder(OrderState.DELIVERY);
        const { paymentRepo, transactionRunner, txOrderRepo, txPaymentRepo } =
            makeDeps([stale], order, stale);

        const useCase = new PaymentTimeoutUseCase(paymentRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.cancelled).toBe(0);
        expect(result.errors).toBe(0);
        expect(txPaymentRepo.save).not.toHaveBeenCalled();
        expect(txOrderRepo.save).not.toHaveBeenCalled();
    });

    it('returns zero cancelled when there are no stale payments', async () => {
        const { paymentRepo, transactionRunner } = makeDeps([], null, null);

        const useCase = new PaymentTimeoutUseCase(paymentRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.cancelled).toBe(0);
        expect(result.errors).toBe(0);
        expect(transactionRunner.run).not.toHaveBeenCalled();
    });

    it('counts errors when a transaction throws, and continues processing remaining', async () => {
        const stale1 = makePayment(PaymentStatus.PENDING, { id: 'pay-1' });
        const stale2 = makePayment(PaymentStatus.PENDING, { id: 'pay-2', orderId: 'order-2' });
        const order = makeOrder(OrderState.PAYMENT);

        const paymentRepo: PaymentRepository = {
            save: vi.fn(),
            findById: vi.fn().mockResolvedValue(stale1),
            findByOrderId: vi.fn(),
            findPendingByOrderId: vi.fn(),
            findByExternalId: vi.fn(),
            findStalePending: vi.fn().mockResolvedValue([stale1, stale2]),
        };

        let callCount = 0;
        const transactionRunner: TransactionRunner = {
            run: vi.fn().mockImplementation(async (work: (ctx: TransactionContext) => Promise<any>) => {
                callCount++;
                if (callCount === 1) throw new Error('DB error');
                return work({
                    orderRepository: { save: vi.fn(), findById: vi.fn().mockResolvedValue(order) },
                    paymentRepository: {
                        save: vi.fn(),
                        findById: vi.fn().mockResolvedValue(stale2),
                        findByOrderId: vi.fn(),
                        findPendingByOrderId: vi.fn(),
                        findByExternalId: vi.fn(),
                        findStalePending: vi.fn(),
                    },
                    productRepository: {} as any,
                });
            }),
        };

        const useCase = new PaymentTimeoutUseCase(paymentRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.errors).toBe(1);
        expect(result.cancelled).toBe(1);
    });

});
