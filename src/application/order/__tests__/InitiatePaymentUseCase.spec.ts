import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InitiatePaymentUseCase } from '../InitiatePaymentUseCase';
import { OrderRepository } from '../../ports/OrderRepository';
import { PaymentRepository } from '../../ports/PaymentRepository';
import { ProductRepository } from '../../ports/ProductRepository';
import { PaymentGateway } from '../../ports/PaymentGateway';
import { OrderState } from '@/domain/order/OrderState';
import { PaymentStatus } from '@/domain/payment/PaymentStatus';
import { Order } from '@/domain/order/Order';
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

const makeProduct = (stock: number): Product => ({
    id: 'p1', name: 'Product', article: 'A1', price: 500, stock,
    imagePath: null, categoryId: 'c1',
});

const mockGateway: PaymentGateway = {
    createPayment: vi.fn().mockResolvedValue({
        externalId: 'yk-ext-id',
        confirmationUrl: 'https://yookassa.ru/checkout/pay/yk-ext-id',
    }),
};

function makeRepos(order: Order | null, product: Product | null) {
    const orderRepo: OrderRepository = {
        save: vi.fn(),
        findById: vi.fn().mockResolvedValue(order),
    };
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
        findAll: vi.fn(),
        findByCategoryId: vi.fn(),
    };
    return { orderRepo, paymentRepo, productRepo };
}

describe('InitiatePaymentUseCase', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates PENDING payment and returns confirmationUrl', async () => {
        const order = makeOrder(OrderState.PAYMENT);
        const { orderRepo, paymentRepo, productRepo } = makeRepos(order, makeProduct(10));

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, productRepo, mockGateway);
        const result = await useCase.execute({ orderId: 'order-1', returnUrl: 'https://example.com/return' });

        expect(result.confirmationUrl).toBe('https://yookassa.ru/checkout/pay/yk-ext-id');

        // Payment сохраняется дважды: сначала PENDING, потом с externalId
        expect(paymentRepo.save).toHaveBeenCalledTimes(2);

        const firstCall = (paymentRepo.save as any).mock.calls[0][0];
        expect(firstCall.status).toBe(PaymentStatus.PENDING);
        expect(firstCall.externalId).toBeUndefined();

        const secondCall = (paymentRepo.save as any).mock.calls[1][0];
        expect(secondCall.externalId).toBe('yk-ext-id');
    });

    it('throws idempotency error when order is already in DELIVERY', async () => {
        const order = makeOrder(OrderState.DELIVERY);
        const { orderRepo, paymentRepo, productRepo } = makeRepos(order, makeProduct(10));

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, productRepo, mockGateway);

        await expect(useCase.execute({ orderId: 'order-1', returnUrl: 'https://example.com/return' }))
            .rejects.toThrow('Payment already processed');

        expect(paymentRepo.save).not.toHaveBeenCalled();
        expect(mockGateway.createPayment).not.toHaveBeenCalled();
    });

    it('cancels order and throws when stock is insufficient', async () => {
        const order = makeOrder(OrderState.PAYMENT); // quantity: 2
        const { orderRepo, paymentRepo, productRepo } = makeRepos(order, makeProduct(1)); // stock: 1

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, productRepo, mockGateway);

        await expect(useCase.execute({ orderId: 'order-1', returnUrl: 'https://example.com/return' }))
            .rejects.toThrow('Insufficient stock');

        expect(orderRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ state: OrderState.CANCELLED })
        );
        expect(mockGateway.createPayment).not.toHaveBeenCalled();
    });

    it('throws if order not found', async () => {
        const { orderRepo, paymentRepo, productRepo } = makeRepos(null, null);

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, productRepo, mockGateway);

        await expect(useCase.execute({ orderId: 'missing', returnUrl: 'https://example.com/return' }))
            .rejects.toThrow('Order not found');
    });

    it('throws when a PENDING payment already exists for the order', async () => {
        const order = makeOrder(OrderState.PAYMENT);
        const { orderRepo, paymentRepo, productRepo } = makeRepos(order, makeProduct(10));

        // Simulate an existing PENDING payment
        (paymentRepo.findPendingByOrderId as any).mockResolvedValue({
            id: 'pay-existing',
            orderId: 'order-1',
            amount: 500,
            status: PaymentStatus.PENDING,
            externalId: 'yk-existing',
            createdAt: new Date(),
        });

        const useCase = new InitiatePaymentUseCase(orderRepo, paymentRepo, productRepo, mockGateway);

        await expect(useCase.execute({ orderId: 'order-1', returnUrl: 'https://example.com/return' }))
            .rejects.toThrow('Payment already in progress');

        expect(paymentRepo.save).not.toHaveBeenCalled();
        expect(mockGateway.createPayment).not.toHaveBeenCalled();
    });
});
