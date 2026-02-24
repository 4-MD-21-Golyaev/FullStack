import { describe, it, expect, vi } from 'vitest';
import { PaymentTimeoutUseCase } from '../PaymentTimeoutUseCase';
import { PaymentRepository } from '../../ports/PaymentRepository';
import { TransactionRunner, TransactionContext } from '../../ports/TransactionRunner';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Payment } from '@/domain/payment/Payment';

const makePayment = (status: PaymentStatus, overrides: Partial<Payment> = {}): Payment => ({
    id: 'pay-1',
    orderId: 'order-1',
    amount: 500,
    status,
    externalId: 'yk-ext-id',
    createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    ...overrides,
});

function makeDeps(stalePayments: Payment[], freshPayment: Payment | null) {
    const paymentRepo: PaymentRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(freshPayment),
        findByOrderId: vi.fn(),
        findPendingByOrderId: vi.fn(),
        findByExternalId: vi.fn(),
        findStalePending: vi.fn().mockResolvedValue(stalePayments),
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
                orderRepository: {} as any,
                paymentRepository: txPaymentRepo,
                productRepository: {} as any,
            })
        ),
    };

    return { paymentRepo, transactionRunner, txPaymentRepo };
}

describe('PaymentTimeoutUseCase', () => {

    it('marks payment FAILED, does NOT cancel order', async () => {
        const stale = makePayment(PaymentStatus.PENDING);
        const { paymentRepo, transactionRunner, txPaymentRepo } =
            makeDeps([stale], stale);

        const useCase = new PaymentTimeoutUseCase(paymentRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.expired).toBe(1);
        expect(result.errors).toBe(0);

        expect(txPaymentRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ status: PaymentStatus.FAILED })
        );
    });

    it('skips payment that was already processed inside transaction (race condition)', async () => {
        const stale = makePayment(PaymentStatus.PENDING);
        // Inside tx, payment is already SUCCESS (processed by webhook concurrently)
        const freshSuccess = makePayment(PaymentStatus.SUCCESS);
        const { paymentRepo, transactionRunner, txPaymentRepo } =
            makeDeps([stale], freshSuccess);

        const useCase = new PaymentTimeoutUseCase(paymentRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.expired).toBe(0);
        expect(result.errors).toBe(0);
        expect(txPaymentRepo.save).not.toHaveBeenCalled();
    });

    it('returns zero expired when there are no stale payments', async () => {
        const { paymentRepo, transactionRunner } = makeDeps([], null);

        const useCase = new PaymentTimeoutUseCase(paymentRepo, transactionRunner);
        const result = await useCase.execute();

        expect(result.expired).toBe(0);
        expect(result.errors).toBe(0);
        expect(transactionRunner.run).not.toHaveBeenCalled();
    });

    it('counts errors when a transaction throws, and continues processing remaining', async () => {
        const stale1 = makePayment(PaymentStatus.PENDING, { id: 'pay-1' });
        const stale2 = makePayment(PaymentStatus.PENDING, { id: 'pay-2', orderId: 'order-2' });

        const paymentRepo: PaymentRepository = {
            save: vi.fn(),
            findById: vi.fn(),
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
                    orderRepository: {} as any,
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
        expect(result.expired).toBe(1);
    });

});
