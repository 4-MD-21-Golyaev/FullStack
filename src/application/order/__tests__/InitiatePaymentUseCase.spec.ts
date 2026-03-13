import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InitiatePaymentUseCase } from '../InitiatePaymentUseCase';
import { PaymentAlreadyInProgressError, PaymentWindowExpiredError } from '@/domain/payment/errors';
import { OrderRepository } from '../../ports/OrderRepository';
import { PaymentRepository } from '../../ports/PaymentRepository';
import { ProductRepository } from '../../ports/ProductRepository';
import { PaymentGateway } from '../../ports/PaymentGateway';
import { TransactionRunner } from '../../ports/TransactionRunner';
import { OrderState } from '@/domain/order/OrderState';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Order } from '@/domain/order/Order';
import { Product } from '@/domain/product/Product';
import { AbsenceResolutionStrategy } from '@/domain/order/AbsenceResolutionStrategy';

const makeOrder = (state: OrderState, updatedAt = new Date()): Order => ({
    id: 'order-1',
    userId: 'user-1',
    address: 'Test address',
    totalAmount: 500,
    state,
    absenceResolutionStrategy: AbsenceResolutionStrategy.CALL_REPLACE,
    items: [{ productId: 'p1', name: 'Product', article: 'A1', price: 500, quantity: 2 }],
    createdAt: new Date(),
    updatedAt,
});

const makeProduct = (stock: number): Product => ({
    id: 'p1', name: 'Product', article: 'A1', price: 500, stock,
    imagePath: null, categoryId: 'c1',
});

const mockGateway: PaymentGateway = {
    createPayment: vi.fn().mockResolvedValue({
        externalId: 'yk-ext-id',
        confirmationUrl: 'https://yookassa.ru/checkout/pay/yk-ext-id',
    }),
    refundPayment: vi.fn(),
};

function makeRepos(order: Order | null, product: Product | null) {
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
    } as unknown as OrderRepository;
    const paymentRepo: PaymentRepository = {
        save: vi.fn(),
        findById: vi.fn(),
        findByOrderId: vi.fn(),
        findPendingByOrderId: vi.fn().mockResolvedValue(null),
        findByExternalId: vi.fn(),
        findStalePending: vi.fn().mockResolvedValue([]),
    };
    const productRepo: ProductRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(product),
        findByIds: vi.fn(),
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
        findByArticle: vi.fn(),
    };
    // TransactionRunner calls the callback with the same repos (simulates in-process transaction)
    const transactionRunner: TransactionRunner = {
        run: vi.fn().mockImplementation((work: (ctx: any) => any) =>
            work({ orderRepository: orderRepo, productRepository: productRepo, paymentRepository: paymentRepo })
        ),
    };
    return { orderRepo, paymentRepo, productRepo, transactionRunner };
}

describe('InitiatePaymentUseCase', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates PENDING payment and returns confirmationUrl', async () => {
        const order = makeOrder(OrderState.PAYMENT);
        const { orderRepo, paymentRepo, transactionRunner } = makeRepos(order, makeProduct(10));

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, mockGateway, transactionRunner);
        const result = await useCase.execute({ orderId: 'order-1', returnUrl: 'https://example.com/return' });

        expect(result.confirmationUrl).toBe('https://yookassa.ru/checkout/pay/yk-ext-id');

        // Payment сохраняется дважды: сначала PENDING (внутри транзакции), потом с externalId
        expect(paymentRepo.save).toHaveBeenCalledTimes(2);

        const firstCall = (paymentRepo.save as any).mock.calls[0][0];
        expect(firstCall.status).toBe(PaymentStatus.PENDING);
        expect(firstCall.externalId).toBeUndefined();

        const secondCall = (paymentRepo.save as any).mock.calls[1][0];
        expect(secondCall.externalId).toBe('yk-ext-id');
    });

    it('throws idempotency error when order is already in DELIVERY', async () => {
        const order = makeOrder(OrderState.DELIVERY);
        const { orderRepo, paymentRepo, transactionRunner } = makeRepos(order, makeProduct(10));

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, mockGateway, transactionRunner);

        await expect(useCase.execute({ orderId: 'order-1', returnUrl: 'https://example.com/return' }))
            .rejects.toThrow('Payment already processed');

        expect(paymentRepo.save).not.toHaveBeenCalled();
        expect(mockGateway.createPayment).not.toHaveBeenCalled();
    });

    it('cancels order and throws when stock is insufficient', async () => {
        const order = makeOrder(OrderState.PAYMENT); // quantity: 2
        const { orderRepo, paymentRepo, transactionRunner } = makeRepos(order, makeProduct(1)); // stock: 1

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, mockGateway, transactionRunner);

        await expect(useCase.execute({ orderId: 'order-1', returnUrl: 'https://example.com/return' }))
            .rejects.toThrow('Insufficient stock');

        expect(orderRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ state: OrderState.CANCELLED })
        );
        expect(mockGateway.createPayment).not.toHaveBeenCalled();
    });

    it('throws if order not found', async () => {
        const { orderRepo, paymentRepo, transactionRunner } = makeRepos(null, null);

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, mockGateway, transactionRunner);

        await expect(useCase.execute({ orderId: 'missing', returnUrl: 'https://example.com/return' }))
            .rejects.toThrow('Order not found');
    });

    it('marks payment FAILED and rethrows when gateway call fails after local PENDING created', async () => {
        const order = makeOrder(OrderState.PAYMENT);
        const { orderRepo, paymentRepo, transactionRunner } = makeRepos(order, makeProduct(10));

        const gatewayError = new Error('YooKassa 503');
        const failingGateway: PaymentGateway = {
            createPayment: vi.fn().mockRejectedValue(gatewayError),
            refundPayment: vi.fn(),
        };

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, failingGateway, transactionRunner);

        await expect(useCase.execute({ orderId: 'order-1', returnUrl: 'https://example.com/return' }))
            .rejects.toThrow('YooKassa 503');

        // payment.save called twice: once PENDING (inside tx), once FAILED (compensation)
        expect(paymentRepo.save).toHaveBeenCalledTimes(2);
        const compensationCall = (paymentRepo.save as any).mock.calls[1][0];
        expect(compensationCall.status).toBe(PaymentStatus.FAILED);
    });

    it('PENDING is cleared after gateway failure so retry can create a new payment', async () => {
        const order = makeOrder(OrderState.PAYMENT);
        const { orderRepo, paymentRepo, transactionRunner } = makeRepos(order, makeProduct(10));

        const failingGateway: PaymentGateway = {
            createPayment: vi.fn().mockRejectedValue(new Error('network error')),
            refundPayment: vi.fn(),
        };

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, failingGateway, transactionRunner);
        await expect(useCase.execute({ orderId: 'order-1', returnUrl: 'https://example.com/return' }))
            .rejects.toThrow();

        // After compensation, the FAILED payment should not block a retry:
        // findPendingByOrderId would return null (FAILED != PENDING)
        // Verify compensation saved FAILED status (pendingOrderLock would be released)
        const compensationCall = (paymentRepo.save as any).mock.calls[1][0];
        expect(compensationCall.status).toBe(PaymentStatus.FAILED);
        expect(compensationCall.externalId).toBeUndefined();
    });

    it('cancels order and throws PaymentWindowExpiredError when payment window has elapsed', async () => {
        const expiredUpdatedAt = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
        const order = makeOrder(OrderState.PAYMENT, expiredUpdatedAt);
        const { orderRepo, paymentRepo, transactionRunner } = makeRepos(order, makeProduct(10));

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, mockGateway, transactionRunner);

        await expect(useCase.execute({ orderId: 'order-1', returnUrl: 'https://example.com/return' }))
            .rejects.toBeInstanceOf(PaymentWindowExpiredError);

        expect(orderRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ state: OrderState.CANCELLED })
        );
        expect(paymentRepo.save).not.toHaveBeenCalled();
        expect(mockGateway.createPayment).not.toHaveBeenCalled();
    });

    it('throws PaymentAlreadyInProgressError when a PENDING payment already exists (check inside transaction)', async () => {
        const order = makeOrder(OrderState.PAYMENT);
        const { orderRepo, paymentRepo, transactionRunner } = makeRepos(order, makeProduct(10));

        // Simulate an existing PENDING payment (found inside transaction context)
        (paymentRepo.findPendingByOrderId as any).mockResolvedValue({
            id: 'pay-existing',
            orderId: 'order-1',
            amount: 500,
            status: PaymentStatus.PENDING,
            externalId: 'yk-existing',
            createdAt: new Date(),
        });

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, mockGateway, transactionRunner);

        await expect(useCase.execute({ orderId: 'order-1', returnUrl: 'https://example.com/return' }))
            .rejects.toBeInstanceOf(PaymentAlreadyInProgressError);

        expect(paymentRepo.save).not.toHaveBeenCalled();
        expect(mockGateway.createPayment).not.toHaveBeenCalled();
    });
});
