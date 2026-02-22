import { describe, it, expect, vi } from 'vitest';
import { ConfirmPaymentUseCase } from '../ConfirmPaymentUseCase';
import { PaymentRepository } from '../../ports/PaymentRepository';
import { TransactionRunner, TransactionContext } from '../../ports/TransactionRunner';
import { OrderState } from '@/domain/order/OrderState';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Order } from '@/domain/order/Order';
import { Payment } from '@/domain/payment/Payment';
import { Product } from '@/domain/product/Product';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

const makeOrder = (state: OrderState): Order => ({
    id: 'order-1',
    userId: 'user-1',
    address: 'Test address',
    totalAmount: 500,
    state,
    absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
    items: [{ productId: 'p1', name: 'Product', article: 'A1', price: 500, quantity: 2 }],
    createdAt: new Date(),
    updatedAt: new Date(),
});

const makePayment = (status: PaymentStatus): Payment => ({
    id: 'pay-1',
    orderId: 'order-1',
    amount: 500,
    status,
    externalId: 'yk-ext-id',
    createdAt: new Date(),
});

const makeProduct = (stock: number): Product => ({
    id: 'p1', name: 'Product', article: 'A1', price: 500, stock,
    imagePath: null, categoryId: 'c1',
});

function makeDeps(payment: Payment | null, order: Order | null, product: Product | null) {
    const paymentRepo: PaymentRepository = {
        save: vi.fn(),
        findById: vi.fn(),
        findByOrderId: vi.fn(),
        findPendingByOrderId: vi.fn(),
        findByExternalId: vi.fn().mockResolvedValue(payment),
        findStalePending: vi.fn().mockResolvedValue([]),
    };

    const txOrderRepo = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(order),
    };
    const txPaymentRepo = {
        save: vi.fn(),
        findById: vi.fn(),
        findByOrderId: vi.fn(),
        findPendingByOrderId: vi.fn(),
        findByExternalId: vi.fn().mockResolvedValue(payment),
        findStalePending: vi.fn().mockResolvedValue([]),
    };
    const txProductRepo = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(product),
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
    };

    const txOutboxRepo = {
        save: vi.fn().mockResolvedValue(undefined),
        findPending: vi.fn(),
        markProcessed: vi.fn(),
        markFailed: vi.fn(),
        incrementRetry: vi.fn(),
    };

    const transactionRunner: TransactionRunner = {
        run: vi.fn().mockImplementation((work: (ctx: TransactionContext) => Promise<any>) =>
            work({
                orderRepository: txOrderRepo,
                paymentRepository: txPaymentRepo,
                productRepository: txProductRepo,
                outboxRepository: txOutboxRepo,
            })
        ),
    };

    return { paymentRepo, transactionRunner, txOrderRepo, txPaymentRepo, txProductRepo, txOutboxRepo };
}

describe('ConfirmPaymentUseCase', () => {

    it('on payment.succeeded: transitions order to DELIVERY and deducts stock', async () => {
        const { paymentRepo, transactionRunner, txProductRepo } =
            makeDeps(makePayment(PaymentStatus.PENDING), makeOrder(OrderState.PAYMENT), makeProduct(10));

        const useCase = new ConfirmPaymentUseCase(paymentRepo, transactionRunner);
        const result = await useCase.execute({ externalId: 'yk-ext-id', event: 'payment.succeeded' });

        expect(result.alreadyProcessed).toBe(false);
        expect(result.order!.state).toBe(OrderState.DELIVERY);
        expect(result.payment!.status).toBe(PaymentStatus.SUCCESS);
        expect(txProductRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ stock: 8 }) // 10 - 2
        );
    });

    it('on payment.canceled: cancels order and marks payment FAILED', async () => {
        const { paymentRepo, transactionRunner, txProductRepo } =
            makeDeps(makePayment(PaymentStatus.PENDING), makeOrder(OrderState.PAYMENT), makeProduct(10));

        const useCase = new ConfirmPaymentUseCase(paymentRepo, transactionRunner);
        const result = await useCase.execute({ externalId: 'yk-ext-id', event: 'payment.canceled' });

        expect(result.order!.state).toBe(OrderState.CANCELLED);
        expect(result.payment!.status).toBe(PaymentStatus.FAILED);
        expect(txProductRepo.save).not.toHaveBeenCalled();
    });

    it('returns alreadyProcessed=true when payment is already SUCCESS (pre-check)', async () => {
        const { paymentRepo, transactionRunner, txOrderRepo, txProductRepo } =
            makeDeps(makePayment(PaymentStatus.SUCCESS), makeOrder(OrderState.DELIVERY), makeProduct(8));

        const result = await new ConfirmPaymentUseCase(paymentRepo, transactionRunner)
            .execute({ externalId: 'yk-ext-id', event: 'payment.succeeded' });

        expect(result.alreadyProcessed).toBe(true);
        expect(txOrderRepo.save).not.toHaveBeenCalled();
        expect(txProductRepo.save).not.toHaveBeenCalled();
    });

    it('returns alreadyProcessed=true when payment is already FAILED (pre-check)', async () => {
        const { paymentRepo, transactionRunner, txOrderRepo } =
            makeDeps(makePayment(PaymentStatus.FAILED), makeOrder(OrderState.CANCELLED), makeProduct(10));

        const result = await new ConfirmPaymentUseCase(paymentRepo, transactionRunner)
            .execute({ externalId: 'yk-ext-id', event: 'payment.canceled' });

        expect(result.alreadyProcessed).toBe(true);
        expect(txOrderRepo.save).not.toHaveBeenCalled();
    });

    it('on succeeded with insufficient stock: cancels order and marks FAILED', async () => {
        const { paymentRepo, transactionRunner, txPaymentRepo, txOrderRepo } =
            makeDeps(makePayment(PaymentStatus.PENDING), makeOrder(OrderState.PAYMENT), makeProduct(1));

        await expect(
            new ConfirmPaymentUseCase(paymentRepo, transactionRunner)
                .execute({ externalId: 'yk-ext-id', event: 'payment.succeeded' })
        ).rejects.toThrow('Insufficient stock');

        expect(txPaymentRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ status: PaymentStatus.FAILED })
        );
        expect(txOrderRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ state: OrderState.CANCELLED })
        );
    });

    it('on payment.succeeded: OutboxEvent записывается с eventType ORDER_DELIVERED и orderId', async () => {
        const { paymentRepo, transactionRunner, txOutboxRepo } =
            makeDeps(makePayment(PaymentStatus.PENDING), makeOrder(OrderState.PAYMENT), makeProduct(10));

        await new ConfirmPaymentUseCase(paymentRepo, transactionRunner)
            .execute({ externalId: 'yk-ext-id', event: 'payment.succeeded' });

        expect(txOutboxRepo.save).toHaveBeenCalledOnce();
        expect(txOutboxRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'ORDER_DELIVERED',
                payload: expect.objectContaining({ orderId: 'order-1' }),
            })
        );
    });

    it('throws if payment not found by externalId', async () => {
        const paymentRepo: PaymentRepository = {
            save: vi.fn(),
            findById: vi.fn(),
            findByOrderId: vi.fn(),
            findPendingByOrderId: vi.fn(),
            findByExternalId: vi.fn().mockResolvedValue(null),
            findStalePending: vi.fn().mockResolvedValue([]),
        };

        await expect(
            new ConfirmPaymentUseCase(paymentRepo, { run: vi.fn() })
                .execute({ externalId: 'unknown', event: 'payment.succeeded' })
        ).rejects.toThrow('not found');
    });
});
